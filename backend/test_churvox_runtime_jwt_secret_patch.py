import os
import types
import unittest
from unittest import mock

from backend import churvox_runtime_jwt_secret_patch as runtime_patch


class RuntimeJwtSecretSourceTest(unittest.TestCase):
    def test_generated_secret_stays_runtime_generated_across_modules(self):
        first = types.SimpleNamespace(JWT_SECRET="")
        second = types.SimpleNamespace(JWT_SECRET="")
        with mock.patch.dict(os.environ, {}, clear=True):
            runtime_patch.install(first)
            generated = first.JWT_SECRET
            runtime_patch.install(second)

            self.assertGreaterEqual(len(generated), 32)
            self.assertEqual(second.JWT_SECRET, generated)
            self.assertEqual(first.CHURVOX_JWT_SECRET_SOURCE, "runtime_generated")
            self.assertEqual(second.CHURVOX_JWT_SECRET_SOURCE, "runtime_generated")
            self.assertFalse(first.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertFalse(second.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertEqual(os.environ[runtime_patch.SOURCE_ENV], "runtime_generated")
            self.assertEqual(os.environ[runtime_patch.PERSISTENT_ENV], "0")

    def test_real_environment_secret_is_persistent_across_modules(self):
        secret = "render-environment-secret-" + "x" * 40
        first = types.SimpleNamespace(JWT_SECRET="")
        second = types.SimpleNamespace(JWT_SECRET="")
        with mock.patch.dict(os.environ, {"JWT_SECRET": secret}, clear=True):
            runtime_patch.install(first)
            runtime_patch.install(second)

            self.assertEqual(first.JWT_SECRET, secret)
            self.assertEqual(second.JWT_SECRET, secret)
            self.assertEqual(first.CHURVOX_JWT_SECRET_SOURCE, "environment")
            self.assertEqual(second.CHURVOX_JWT_SECRET_SOURCE, "environment")
            self.assertTrue(first.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertTrue(second.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertEqual(os.environ[runtime_patch.SOURCE_ENV], "environment")
            self.assertEqual(os.environ[runtime_patch.PERSISTENT_ENV], "1")


if __name__ == "__main__":
    unittest.main()
