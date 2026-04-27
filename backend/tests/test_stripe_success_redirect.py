"""
Verify that /api/stripe/checkout-success redirects to /dashboard (not /plans)
on a successful paid checkout, and preserves plan + session_id in the query.

Uses a monkey-patched Stripe SDK so no real Stripe call is made.
Run: python3 /app/backend/tests/test_stripe_success_redirect.py
"""
import os, sys, asyncio, types
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Load real backend env so server.py can connect to MongoDB on import
load_dotenv("/app/backend/.env")

sys.path.insert(0, "/app/backend")


def main():
    import server  # imports FastAPI app

    # Build a fake Stripe session object
    fake_session = types.SimpleNamespace(
        metadata={"user_id": "test-user-123", "plan": "team"},
        customer="cus_fake_123",
        subscription="sub_fake_456",
    )

    async def fake_set_plan(*args, **kwargs):
        return None

    from fastapi.testclient import TestClient

    with patch.object(server.stripe.checkout.Session, "retrieve", return_value=fake_session), \
         patch.object(server, "set_business_plan_from_checkout", new=fake_set_plan), \
         patch.object(server, "STRIPE_SECRET_KEY", "sk_test_fake"):
        client = TestClient(server.app)
        resp = client.get("/api/stripe/checkout-success?session_id=cs_fake_abc", follow_redirects=False)

    assert resp.status_code in (302, 303, 307), f"expected redirect, got {resp.status_code}"
    loc = resp.headers.get("location") or ""
    print("Location:", loc)
    assert "/dashboard" in loc, f"expected /dashboard in redirect, got: {loc}"
    assert "/plans?checkout=success" not in loc, f"should NOT go to /plans on success: {loc}"
    assert "checkout=success" in loc, f"expected checkout=success flag: {loc}"
    assert "plan=team" in loc, f"expected plan=team: {loc}"
    assert "session_id=cs_fake_abc" in loc, f"expected session_id preserved: {loc}"
    print("\nSTRIPE_SUCCESS_REDIRECT_OK — sends user to /dashboard with plan + session_id")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print("FAIL:", e)
        sys.exit(1)
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(2)
