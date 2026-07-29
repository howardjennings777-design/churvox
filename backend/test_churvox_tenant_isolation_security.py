import asyncio
from datetime import datetime, timedelta, timezone
import pathlib
import sys
import types
import unittest

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import churvox_tenant_isolation_security_patch as security
import churvox_tenant_payment_isolation_patch as payment_security
import churvox_role_and_share_isolation_patch as role_security


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


class FakeJSONResponse:
    def __init__(self, content, status_code=200):
        self.content = content
        self.status_code = status_code
        self.headers = {}


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

    def test_accounting_exports_and_xero_are_owner_only(self):
        self.assertTrue(role_security.owner_only_path('/api/accounting/export/pack', 'GET'))
        self.assertTrue(role_security.owner_only_path('/api/accounting/bookkeeper', 'GET'))
        self.assertTrue(role_security.owner_only_path('/api/xero/status', 'GET'))
        self.assertFalse(role_security.owner_only_path('/api/xero/callback', 'GET'))
        self.assertFalse(role_security.owner_only_path('/api/worker/jobs', 'GET'))

    def test_xero_oauth_state_expires_after_ten_minutes(self):
        now = datetime(2026, 7, 29, 1, 0, tzinfo=timezone.utc)
        self.assertTrue(role_security.xero_state_recent({'created_at': now - timedelta(minutes=9)}, now=now))
        self.assertFalse(role_security.xero_state_recent({'created_at': now - timedelta(minutes=11)}, now=now))
        self.assertFalse(role_security.xero_state_recent({'created_at': now + timedelta(seconds=1)}, now=now))
        self.assertFalse(role_security.xero_state_recent({}, now=now))

    def test_public_proof_requires_real_bearer_token(self):
        self.assertFalse(role_security.valid_public_token('123'))
        self.assertFalse(role_security.valid_public_token('ordinary-record-id'))
        self.assertTrue(role_security.valid_public_token('a' * 32))
        collection = FakeCollection([
            {
                'id': 'guessable-id',
                'public_token': 'a' * 32,
                'business_id': 'business-a',
                'owner_id': 'owner-a',
                'job_title': 'Safe proof',
                'customer_name': 'Customer',
                'photos': [],
            }
        ])
        module = types.SimpleNamespace(
            JSONResponse=FakeJSONResponse,
            db=FakeDB(job_proof_packs=collection),
        )
        missing = asyncio.run(role_security.secure_public_proof(module, None, 'ordinary-record-id'))
        self.assertEqual(missing.status_code, 404)
        response = asyncio.run(role_security.secure_public_proof(module, None, 'a' * 32))
        self.assertEqual(response.status_code, 200)
        proof = response.content['proof_pack']
        self.assertNotIn('business_id', proof)
        self.assertNotIn('owner_id', proof)
        self.assertNotIn('public_token', proof)
        self.assertNotIn('id', repr(collection.last_query))

    def test_worker_can_access_only_assigned_job(self):
        jobs = FakeCollection([
            {'id': 'job-b', 'business_id': 'business-b', 'assigned_worker_id': 'worker-a'},
            {'id': 'job-other', 'business_id': 'business-a', 'assigned_worker_id': 'worker-b'},
            {'id': 'job-own', 'business_id': 'business-a', 'assigned_worker_id': 'worker-a'},
        ])
        module = types.SimpleNamespace(
            ObjectId=FakeObjectId,
            db=FakeDB(jobs=jobs, job_records=FakeCollection([]), business_jobs=FakeCollection([])),
        )
        worker = {'id': 'worker-a', 'business_id': 'business-a', 'role': 'worker'}
        self.assertTrue(asyncio.run(role_security.worker_job_allowed(module, worker, 'job-own')))
        self.assertFalse(asyncio.run(role_security.worker_job_allowed(module, worker, 'job-other')))
        self.assertFalse(asyncio.run(role_security.worker_job_allowed(module, worker, 'job-b')))

    def test_security_patches_are_wired_into_backend_boot(self):
        terminal = (BACKEND_DIR / 'churvox_terminal_reader_patch.py').read_text(encoding='utf-8')
        self.assertIn('churvox_tenant_isolation_security_patch.install(module)', terminal)
        self.assertIn('churvox_tenant_payment_isolation_patch.install(module)', terminal)
        self.assertIn('churvox_role_and_share_isolation_patch.install(module)', terminal)
        self.assertIn('globals()["payment_account"]', terminal)


if __name__ == '__main__':
    unittest.main()
