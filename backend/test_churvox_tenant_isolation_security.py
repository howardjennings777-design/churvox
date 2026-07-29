import asyncio
import pathlib
import sys
import types
import unittest

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import churvox_tenant_isolation_security_patch as security
import churvox_tenant_payment_isolation_patch as payment_security


class FakeObjectId:
    def __init__(self, value):
        self.value = str(value)

    @staticmethod
    def is_valid(value):
        raw = str(value)
        return len(raw) == 24 and all(ch in '0123456789abcdefABCDEF' for ch in raw)

    def __str__(self):
        return self.value

    def __eq__(self, other):
        return str(other) == self.value

    def __hash__(self):
        return hash(self.value)


def field_value(doc, dotted):
    value = doc
    for part in dotted.split('.'):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def matches(doc, query):
    if not isinstance(query, dict):
        return False
    for key, expected in query.items():
        if key == '$or':
            if not any(matches(doc, item) for item in expected):
                return False
            continue
        if key == '$and':
            if not all(matches(doc, item) for item in expected):
                return False
            continue
        actual = field_value(doc, key)
        if isinstance(expected, dict) and '$in' in expected:
            if actual not in expected['$in']:
                return False
        elif actual != expected:
            return False
    return True


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.last_query = None

    async def find_one(self, query):
        self.last_query = query
        return next((row for row in self.rows if matches(row, query)), None)


class FakeDB:
    def __init__(self, **collections):
        self._collections = collections

    def __getitem__(self, name):
        return self._collections[name]

    def __getattr__(self, name):
        try:
            return self._collections[name]
        except KeyError as exc:
            raise AttributeError(name) from exc


class TenantIsolationSecurityTests(unittest.TestCase):
    def setUp(self):
        # This is the definitive query installed at backend boot.
        security.strict_business_query = payment_security.strict_business_scope
        self.owner_a = {'id': 'owner-a', 'business_id': 'business-a', 'email': 'same@example.test', 'role': 'owner'}
        self.owner_b = {'id': 'owner-b', 'business_id': 'business-b', 'email': 'same@example.test', 'role': 'owner'}

    def test_business_scope_uses_tenant_ids_not_contact_email(self):
        query = payment_security.strict_business_scope(self.owner_a, FakeObjectId)
        self.assertTrue(matches({'business_id': 'business-a', 'email': 'other@example.test'}, query))
        self.assertFalse(matches({'business_id': 'business-b', 'email': 'same@example.test'}, query))
        self.assertFalse(matches({'business_id': 'business-b', 'owner_id': 'owner-a'}, query))
        self.assertFalse(matches({'email': 'same@example.test'}, query))
        self.assertNotIn('email', repr(query))
        self.assertNotIn('owner_id', repr(query))
        self.assertNotIn('$exists', repr(query))

    def test_direct_record_query_rejects_other_tenant_even_when_id_matches(self):
        query = security.strict_record_query(self.owner_a, FakeObjectId, 'record-1', ('id', 'job_id'))
        self.assertTrue(matches({'id': 'record-1', 'business_id': 'business-a'}, query))
        self.assertFalse(matches({'id': 'record-1', 'business_id': 'business-b', 'owner_id': 'owner-a'}, query))
        self.assertFalse(matches({'id': 'record-1'}, query))

    def test_cors_rejects_arbitrary_hosting_domains(self):
        self.assertTrue(security.origin_allowed('https://www.churvox.com'))
        self.assertTrue(security.origin_allowed('https://app.churvox.com'))
        self.assertFalse(security.origin_allowed('https://evil.onrender.com'))
        self.assertFalse(security.origin_allowed('https://evil.vercel.app'))
        self.assertFalse(security.origin_allowed('https://churvox.com.attacker.test'))

    def test_business_admin_is_not_platform_owner(self):
        self.assertFalse(security.is_platform_owner({'role': 'admin', 'is_admin': True, 'email': 'admin@company.test'}))
        self.assertTrue(security.is_platform_owner({'role': 'platform_owner', 'email': 'platform@example.test'}))
        self.assertTrue(security.is_platform_owner({'role': 'owner', 'email': 'hello@churvox.com'}))

    def test_frontend_cannot_replace_tenant_ownership_fields(self):
        clean = security.clean_payload({
            'title': 'Safe job',
            'business_id': 'business-b',
            'owner_id': 'owner-b',
            'owner_email': 'other@example.test',
        })
        self.assertEqual(clean, {'title': 'Safe job'})

    def test_owner_interceptor_does_not_capture_public_routes(self):
        self.assertFalse(payment_security.owner_route('/api/auth/register', 'POST'))
        self.assertFalse(payment_security.owner_route('/api/public/customer-request', 'POST'))
        self.assertTrue(payment_security.owner_route('/api/jobs', 'GET'))
        self.assertTrue(payment_security.owner_route('/api/clients/client-1', 'PATCH'))
        self.assertFalse(payment_security.owner_route('/api/jobs/job-1/start', 'POST'))

    def test_sensitive_paths_are_claimed_by_security_layer(self):
        self.assertEqual(security.parse_sensitive_path('/api/records/job/abc', 'DELETE'), ('delete', 'job', 'abc'))
        self.assertEqual(security.parse_sensitive_path('/api/quotes/q1/convert-to-job', 'POST'), ('convert-to-job', 'quote', 'q1'))
        self.assertEqual(security.parse_sensitive_path('/api/jobs/j1/assign', 'POST'), ('assign', 'job', 'j1'))
        self.assertEqual(security.parse_sensitive_path('/api/messages/m1/reply', 'POST'), ('reply', 'message', 'm1'))

    def test_sms_client_lookup_is_scoped_to_jobs_business(self):
        clients = FakeCollection([
            {'id': 'client-1', 'business_id': 'business-b', 'phone': '+64000000000'},
            {'id': 'client-1', 'business_id': 'business-a', 'phone': '+64111111111'},
        ])
        module = types.SimpleNamespace(
            ObjectId=FakeObjectId,
            db=FakeDB(clients=clients),
            get_phone_from_dict=lambda row: (row or {}).get('phone') if isinstance(row, dict) else None,
        )
        phone = asyncio.run(security.secure_sms_phone(module, {
            'business_id': 'business-a',
            'client_id': 'client-1',
        }))
        self.assertEqual(phone, '+64111111111')
        self.assertIn('business_id', repr(clients.last_query))

    def test_worker_resolves_only_own_business_payment_account(self):
        db = FakeDB(
            payment_settings=FakeCollection([]),
            users=FakeCollection([
                {'_id': 'owner-b', 'business_id': 'business-b', 'role': 'owner', 'stripe_account_id': 'acct_b'},
                {'_id': 'worker-a', 'business_id': 'business-a', 'role': 'worker'},
                {'_id': 'owner-a', 'business_id': 'business-a', 'role': 'owner', 'stripe_account_id': 'acct_a'},
            ]),
        )
        settings, owner, account_id = asyncio.run(payment_security.secure_payment_account(db, {
            'id': 'worker-a', 'business_id': 'business-a', 'role': 'worker'
        }, FakeObjectId))
        self.assertEqual(settings, {})
        self.assertEqual(owner.get('business_id'), 'business-a')
        self.assertEqual(account_id, 'acct_a')

    def test_payment_patch_disables_global_account_reuse(self):
        payments = types.ModuleType('churvox_on_site_payments_patch')
        payments.first_existing_connected_account = lambda _stripe: 'acct_wrong_global'
        sys.modules['churvox_on_site_payments_patch'] = payments
        try:
            self.assertTrue(payment_security.install())
            self.assertEqual(payments.first_existing_connected_account(object()), '')
            self.assertIs(payments.payment_account, payment_security.secure_payment_account)
            self.assertIs(security.strict_business_query, payment_security.strict_business_scope)
        finally:
            sys.modules.pop('churvox_on_site_payments_patch', None)

    def test_security_patches_are_wired_into_backend_boot(self):
        terminal = (BACKEND_DIR / 'churvox_terminal_reader_patch.py').read_text(encoding='utf-8')
        self.assertIn('churvox_tenant_isolation_security_patch.install(module)', terminal)
        self.assertIn('churvox_tenant_payment_isolation_patch.install(module)', terminal)
        self.assertIn('globals()["payment_account"]', terminal)


if __name__ == '__main__':
    unittest.main()
