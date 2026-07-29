import asyncio
import pathlib
import sys
import types
import unittest

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import churvox_tenant_payment_isolation_patch as payment_security


class FakeObjectIdShim:
    available = False

    @staticmethod
    def make(value):
        return str(value)


def value_at(doc, dotted):
    value = doc
    for part in dotted.split('.'):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def matches(doc, query):
    for key, expected in (query or {}).items():
        if key == '$and':
            if not all(matches(doc, part) for part in expected):
                return False
            continue
        if key == '$or':
            if not any(matches(doc, part) for part in expected):
                return False
            continue
        actual = value_at(doc, key)
        if isinstance(expected, dict) and '$in' in expected:
            if actual not in expected['$in']:
                return False
        elif actual != expected:
            return False
    return True


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])

    async def find_one(self, query):
        return next((row for row in self.rows if matches(row, query)), None)


class FakeDB:
    def __init__(self):
        self.payment_settings = FakeCollection([])
        self.users = FakeCollection([
            {'_id': 'owner-b', 'business_id': 'business-b', 'role': 'owner', 'stripe_account_id': 'acct_b'},
            {'_id': 'worker-a', 'business_id': 'business-a', 'role': 'worker'},
            {'_id': 'owner-a', 'business_id': 'business-a', 'role': 'owner', 'stripe_account_id': 'acct_a'},
        ])


class AccountingPaymentTenantIsolationTests(unittest.TestCase):
    def test_accounting_module_cannot_use_global_or_other_business_account(self):
        payments = types.ModuleType('churvox_on_site_payments_patch')
        payments.first_existing_connected_account = lambda _stripe: 'acct_global'

        accounting = types.ModuleType('churvox_accounting_routes')
        accounting.ObjectIdShim = FakeObjectIdShim
        accounting._owner_doc = lambda _db, _user: {'stripe_account_id': 'acct_wrong'}
        accounting._payment_settings = lambda _db, _user, _owner=None: ({}, {}, 'acct_global')

        previous_payments = sys.modules.get('churvox_on_site_payments_patch')
        previous_accounting = sys.modules.get('churvox_accounting_routes')
        sys.modules['churvox_on_site_payments_patch'] = payments
        sys.modules['churvox_accounting_routes'] = accounting
        try:
            self.assertTrue(payment_security.install())
            settings, owner, account_id = asyncio.run(accounting._payment_settings(
                FakeDB(),
                {'id': 'worker-a', 'business_id': 'business-a', 'role': 'worker'},
            ))
            self.assertEqual(settings, {})
            self.assertEqual(owner.get('business_id'), 'business-a')
            self.assertEqual(account_id, 'acct_a')
            self.assertNotEqual(account_id, 'acct_b')
            self.assertNotEqual(account_id, 'acct_global')
            self.assertEqual(payments.first_existing_connected_account(object()), '')
        finally:
            if previous_payments is None:
                sys.modules.pop('churvox_on_site_payments_patch', None)
            else:
                sys.modules['churvox_on_site_payments_patch'] = previous_payments
            if previous_accounting is None:
                sys.modules.pop('churvox_accounting_routes', None)
            else:
                sys.modules['churvox_accounting_routes'] = previous_accounting


if __name__ == '__main__':
    unittest.main()
