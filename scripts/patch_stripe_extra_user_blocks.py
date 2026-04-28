from pathlib import Path
import re

path = Path('backend/server.py')
text = path.read_text(encoding='utf-8')

if 'confirm_extra_user_block_checkout' in text and 'create_extra_user_block_checkout' in text:
    print('Extra user block Stripe backend already patched')
    raise SystemExit(0)

# Make checkout request model accept both plan and add-on payloads.
text = text.replace(
'''class CreateCheckoutSessionRequest(BaseModel):
    plan: PlanType
''',
'''class CreateCheckoutSessionRequest(BaseModel):
    plan: Optional[PlanType] = None
    plan_type: Optional[str] = None
    addon_type: Optional[str] = None
    quantity: Optional[int] = 1
    country: Optional[str] = None
'''
)

marker = '@api_router.post("/stripe/create-checkout-session")'
if marker not in text:
    raise SystemExit('Could not find /stripe/create-checkout-session marker')

extra_routes = r'''

# ===================== EXTRA USER BLOCK STRIPE CHECKOUT =====================
# Enterprise add-on: +50 users for $100/month. This route is intentionally
# registered before the legacy Stripe checkout route so it can handle add-ons.

@api_router.post("/stripe/create-checkout-session")
async def create_extra_user_block_checkout(payload: dict, current_user: dict = Depends(require_employer)):
    plan_type = str((payload or {}).get("plan_type") or (payload or {}).get("plan") or "").strip().lower()
    addon_type = str((payload or {}).get("addon_type") or "").strip().lower()

    if plan_type not in {"enterprise_user_block", "extra_user_block"} and addon_type != "extra_user_block":
        # Let the legacy plan checkout route below handle normal plan purchases.
        raise HTTPException(status_code=404, detail="Not an extra user block checkout")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    current_plan = normalize_plan(current_user.get("plan") or current_user.get("plan_type") or "")
    if current_plan != "enterprise":
        raise HTTPException(status_code=400, detail="Extra 50-user blocks are available on Enterprise only")

    try:
        quantity = int((payload or {}).get("quantity") or 1)
    except Exception:
        quantity = 1
    quantity = max(1, min(quantity, 20))

    business_id = str(current_user.get("business_id") or current_user.get("id") or current_user.get("_id") or "")
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    customer_email = current_user.get("email") or None

    success_url = f"{FRONTEND_URL}/plans?checkout=success&addon=extra_user_block&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{FRONTEND_URL}/plans?checkout=cancelled&addon=extra_user_block"

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=customer_email,
        line_items=[{
            "price_data": {
                "currency": "nzd",
                "unit_amount": 10000,
                "recurring": {"interval": "month"},
                "product_data": {"name": "Churvox extra 50 users"},
            },
            "quantity": quantity,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "extra_user_block",
            "addon_type": "extra_user_block",
            "plan_type": "enterprise_user_block",
            "user_id": user_id,
            "business_id": business_id,
            "extra_user_blocks": str(quantity),
        },
    )

    return {
        "success": True,
        "checkout_url": session.url,
        "url": session.url,
        "session_id": session.id,
        "addon_type": "extra_user_block",
        "extra_user_blocks": quantity,
    }


@api_router.post("/billing/confirm-extra-user-block")
async def confirm_extra_user_block_checkout(payload: dict, current_user: dict = Depends(require_employer)):
    session_id = str((payload or {}).get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not verify Stripe checkout: {exc}")

    metadata = dict(getattr(session, "metadata", {}) or {})
    if metadata.get("addon_type") != "extra_user_block" and metadata.get("type") != "extra_user_block":
        raise HTTPException(status_code=400, detail="Checkout session is not an extra user block purchase")

    payment_status = str(getattr(session, "payment_status", "") or "").lower()
    status = str(getattr(session, "status", "") or "").lower()
    if payment_status not in {"paid", "no_payment_required"} and status != "complete":
        raise HTTPException(status_code=400, detail="Checkout has not completed yet")

    existing = await db.billing_events.find_one({"stripe_session_id": session_id, "type": "extra_user_block"})
    if existing:
        return {"success": True, "already_processed": True, "extra_user_blocks": existing.get("extra_user_blocks", 0)}

    try:
        blocks = int(metadata.get("extra_user_blocks") or 1)
    except Exception:
        blocks = 1
    blocks = max(1, min(blocks, 20))

    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    business_id = str(current_user.get("business_id") or user_id)
    owner_filter = {"$or": [{"_id": ObjectId(user_id)}, {"business_id": business_id, "role": {"$in": ["owner", "employer", "admin"]}}]}

    await db.users.update_one(
        owner_filter,
        {
            "$inc": {"extra_user_blocks": blocks},
            "$set": {
                "extra_user_blocks_updated_at": datetime.now(timezone.utc),
                "extra_user_block_price": 100,
                "extra_user_block_size": 50,
            },
        },
    )
    await db.billing_events.insert_one({
        "type": "extra_user_block",
        "stripe_session_id": session_id,
        "stripe_subscription_id": getattr(session, "subscription", None),
        "business_id": business_id,
        "user_id": user_id,
        "extra_user_blocks": blocks,
        "amount": 100 * blocks,
        "currency": "nzd",
        "created_at": datetime.now(timezone.utc),
    })

    return {"success": True, "extra_user_blocks_added": blocks, "extra_users_added": blocks * 50}

# ===================== END EXTRA USER BLOCK STRIPE CHECKOUT =====================

'''

text = text.replace(marker, extra_routes + marker, 1)

# Patch billing status to expose add-on capacity if the response is dict-like.
# This is best-effort and safe if the exact route shape differs.
if 'extra_user_blocks' not in text[text.find('@api_router.get("/billing/status")') if '@api_router.get("/billing/status")' in text else 0: text.find('@api_router.get("/billing/status")') + 2500 if '@api_router.get("/billing/status")' in text else 0]:
    text = text.replace(
        '"plan": user.get("plan", "solo"),',
        '"plan": user.get("plan", "solo"),\n        "extra_user_blocks": int(user.get("extra_user_blocks") or 0),\n        "extra_user_block_size": 50,\n        "extra_user_block_price": 100,',
        1,
    )

path.write_text(text, encoding='utf-8')
print('Patched backend Stripe extra user block checkout and confirm endpoint')
