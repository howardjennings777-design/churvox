import pathlib
import sys
import unittest

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import churvox_role_and_share_isolation_patch as roles
import churvox_security_final_tightening_patch as final_security


class SecurityFinalTighteningTests(unittest.TestCase):
    def test_payment_status_becomes_owner_only(self):
        roles.OWNER_ONLY_EXACT.discard('/api/payments/on-site/status')
        self.assertFalse(roles.owner_only_path('/api/payments/on-site/status', 'GET'))
        self.assertTrue(final_security.install())
        self.assertTrue(roles.owner_only_path('/api/payments/on-site/status', 'GET'))

    def test_public_photo_drops_internal_tenant_and_storage_metadata(self):
        photo = final_security.public_photo({
            'url': 'https://cdn.example.test/photo.jpg',
            'caption': 'Completed work',
            'business_id': 'business-a',
            'worker_id': 'worker-a',
            'storage_key': 'private/business-a/photo.jpg',
            'access_token': 'secret',
        })
        self.assertEqual(photo, {
            'url': 'https://cdn.example.test/photo.jpg',
            'caption': 'Completed work',
        })

    def test_final_layer_is_wired_after_role_guard(self):
        boot = (BACKEND_DIR / 'churvox_terminal_reader_patch.py').read_text(encoding='utf-8')
        role_at = boot.index('churvox_role_and_share_isolation_patch.install(module)')
        final_at = boot.index('churvox_security_final_tightening_patch.install(module)')
        self.assertLess(role_at, final_at)


if __name__ == '__main__':
    unittest.main()
