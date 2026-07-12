import unittest

from backend.churvox_worker_login_role_guard import worker_account


class WorkerLoginRoleBoundaryTest(unittest.TestCase):
    def test_owner_and_admin_accounts_are_not_workers(self):
        self.assertFalse(worker_account({"role": "owner", "worker_id": "bad-flag"}))
        self.assertFalse(worker_account({"role": "employer", "is_worker": True}))
        self.assertFalse(worker_account({"role": "admin", "worker_login": True}))

    def test_payroll_account_is_not_worker_login(self):
        self.assertFalse(worker_account({"role": "payroll", "worker_id": "payroll-id"}))

    def test_worker_markers_are_accepted(self):
        self.assertTrue(worker_account({"role": "worker"}))
        self.assertTrue(worker_account({"role": "staff"}))
        self.assertTrue(worker_account({"worker_id": "worker-id"}))
        self.assertTrue(worker_account({"is_worker": True}))

    def test_untyped_owner_like_record_is_not_assumed_worker(self):
        self.assertFalse(worker_account({"email": "owner@example.test"}))


if __name__ == "__main__":
    unittest.main()
