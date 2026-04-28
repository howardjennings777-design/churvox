from pathlib import Path

SERVER = Path('backend/server.py')
text = SERVER.read_text(encoding='utf-8')

marker = '# ===================== END PLATFORM OWNER ADMIN ENDPOINTS ====================='
if marker not in text:
    raise SystemExit('Could not find admin endpoints end marker in backend/server.py')

# Replace an existing admin delete endpoint if present so the behavior updates safely.
start = text.find('@api_router.delete("/admin/users/{user_id}")')
if start != -1:
    end = text.find(marker, start)
    if end == -1:
        raise SystemExit('Could not find end marker after existing delete endpoint')
    text = text[:start].rstrip() + '\n\n' + text[end:]

block = r'''

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_platform_user(user_id: str, current_user: dict = Depends(require_platform_owner_user)):
    """Delete a user or business owner from the platform owner dashboard.

    Protected by design:
    - platform owner accounts cannot be deleted here
    - hello@churvox.com cannot be deleted here
    - the logged-in platform owner cannot delete themselves
    - deleted records are archived into deleted_users first
    """
    target_query = None
    try:
        target_query = {"_id": ObjectId(str(user_id))}
    except Exception:
        target_query = {"email": str(user_id).strip().lower()}

    target = await db.users.find_one(target_query)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_id = str(target.get("_id") or target.get("id") or "")
    current_id = str(current_user.get("id") or current_user.get("_id") or "")
    target_email = str(target.get("email") or "").strip().lower()
    current_email = str(current_user.get("email") or "").strip().lower()
    target_role = str(target.get("role") or "").strip().lower()

    if target_id and current_id and target_id == current_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own platform owner account")
    if target_email and current_email and target_email == current_email:
        raise HTTPException(status_code=400, detail="You cannot delete your own platform owner account")
    if target_email == "hello@churvox.com":
        raise HTTPException(status_code=400, detail="hello@churvox.com is the protected platform owner account")
    if target.get("is_platform_owner") is True or is_platform_owner(target) or target_role == "platform_owner":
        raise HTTPException(status_code=400, detail="Platform owner accounts cannot be deleted here")

    archive = dict(target)
    archive["original_user_id"] = str(target.get("_id") or "")
    archive["deleted_at"] = datetime.now(timezone.utc)
    archive["deleted_by"] = current_email or current_id
    archive["delete_source"] = "app_owner_dashboard"
    archive.pop("password_hash", None)
    archive.pop("password", None)
    try:
        await db.deleted_users.insert_one(archive)
    except Exception:
        pass

    await db.users.delete_one({"_id": target.get("_id")})

    business_id = str(target.get("business_id") or "")
    if business_id:
        # Best effort cleanup for worker assignments. Business data itself is not deleted here.
        try:
            await db.jobs.update_many(
                {"business_id": business_id, "assigned_worker_id": target_id},
                {"$unset": {"assigned_worker_id": "", "assigned_worker_name": ""}}
            )
        except Exception:
            pass

    return {
        "success": True,
        "deleted": True,
        "user_id": target_id,
        "email": target_email,
        "role": target_role,
        "message": "User deleted",
    }

'''

text = text.replace(marker, block + marker, 1)
SERVER.write_text(text, encoding='utf-8')
print('Inserted app-owner user/business-owner delete endpoint into backend/server.py')
