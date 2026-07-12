import unittest

try:
    from churvox_feature_tier_paid_launch_guard import can_access, effective_plan, required_access
except ImportError:
    from backend.churvox_feature_tier_paid_launch_guard import can_access, effective_plan, required_access


class FeatureTierPaidLaunchTests(unittest.TestCase):
    def user(self, plan, **extra):
        return {
            "email": f"{plan}@example.test",
            "role": "owner",
            "plan": plan,
            "subscription_status": "active",
            "stripe_subscription_id": f"sub_{plan}",
            **extra,
        }

    def assert_allowed(self, path, user):
        allowed, access, plan = can_access(path, user)
        self.assertTrue(allowed, f"Expected {path} to be allowed for {plan}; rule={access}")

    def assert_blocked(self, path, user, minimum):
        allowed, access, plan = can_access(path, user)
        self.assertFalse(allowed, f"Expected {path} to be blocked for {plan}")
        self.assertIsNotNone(access)
        self.assertEqual(access.minimum_plan, minimum)

    def test_core_routes_stay_open_from_start(self):
        start = self.user("solo")
        for path in ("/api/jobs", "/api/clients", "/api/quotes", "/api/invoices", "/api/smart-hub", "/api/plan/usage"):
            self.assert_allowed(path, start)

    def test_start_cannot_call_higher_tier_owner_apis(self):
        start = self.user("start")
        self.assert_blocked("/api/messages", start, "crew")
        self.assert_blocked("/api/workers", start, "crew")
        self.assert_blocked("/api/client-portal/proof-job", start, "crew")
        self.assert_blocked("/api/command", start, "operator")
        self.assert_blocked("/api/payroll/summary", start, "operator")
        self.assert_blocked("/api/integrations/xero/status", start, "command")

    def test_crew_gets_messages_workers_and_proof_not_operator_tools(self):
        crew = self.user("team")
        for path in ("/api/messages", "/api/workers", "/api/client-portal/proof-job", "/api/field-activity"):
            self.assert_allowed(path, crew)
        self.assert_blocked("/api/command", crew, "operator")
        self.assert_blocked("/api/payroll", crew, "operator")
        self.assert_blocked("/api/xero/status", crew, "command")

    def test_operator_gets_command_and_payroll_not_accounting_without_addon(self):
        operator = self.user("pro")
        self.assert_allowed("/api/command", operator)
        self.assert_allowed("/api/ai/actions", operator)
        self.assert_allowed("/api/payroll", operator)
        self.assert_blocked("/api/xero/status", operator, "command")

    def test_accounting_addon_opens_xero_below_command(self):
        operator = self.user("operator", accounting_sync_active=True)
        self.assert_allowed("/api/xero/status", operator)
        self.assert_allowed("/api/accounting/export/pack", operator)

    def test_command_and_full_access_tester_get_full_features(self):
        command = self.user("enterprise")
        for path in ("/api/command", "/api/payroll", "/api/xero/status", "/api/exports/data"):
            self.assert_allowed(path, command)

        tester = self.user("pro", free_tester_access=True, tester_pack="full_access", subscription_status="tester_free")
        self.assertEqual(effective_plan(tester), "command")
        self.assert_allowed("/api/xero/status", tester)
        self.assert_allowed("/api/exports/data", tester)

    def test_public_worker_auth_and_billing_routes_are_exempt(self):
        start = self.user("start")
        for path in (
            "/api/public/invoice/token",
            "/api/worker/jobs",
            "/api/auth/login",
            "/api/billing/create-checkout-session",
            "/api/admin/owner/testers",
            "/api/command/live-smoke-marker",
        ):
            self.assertIsNone(required_access(path))
            self.assert_allowed(path, start)


if __name__ == "__main__":
    unittest.main()
