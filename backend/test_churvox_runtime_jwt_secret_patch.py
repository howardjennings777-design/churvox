import os
import types
import unittest
from unittest import mock

from backend import churvox_production_launch_security as launch_security
from backend import churvox_runtime_jwt_secret_patch as runtime_patch


class FakeCollection:
    def __init__(self, document=None):
        self.document = dict(document) if document else None

    def update_one(self, query, update, upsert=False):
        matches = self.document is not None and self.document.get("_id") == query.get("_id")
        if matches and "secret" in query:
            condition = query["secret"]
            if isinstance(condition, dict) and "$exists" in condition:
                matches = ("secret" in self.document) is bool(condition["$exists"])
            else:
                matches = self.document.get("secret") == condition

        if self.document is None and upsert:
            self.document = {"_id": query.get("_id")}
            self.document.update(update.get("$setOnInsert", {}))
            self.document.update(update.get("$set", {}))
        elif matches:
            self.document.update(update.get("$set", {}))
        return types.SimpleNamespace(matched_count=1 if matches else 0)

    def find_one(self, query, projection=None):
        if self.document is None or self.document.get("_id") != query.get("_id"):
            return None
        if projection:
            return {key: value for key, value in self.document.items() if key == "_id" or projection.get(key)}
        return dict(self.document)


class FakeDatabase:
    def __init__(self, collection):
        self.collection = collection

    def __getitem__(self, name):
        self.last_collection_name = name
        return self.collection


class FakeMongoClient:
    def __init__(self, database):
        self.database = database
        self.closed = False

    def __getitem__(self, name):
        self.last_database_name = name
        return self.database

    def close(self):
        self.closed = True


class RuntimeJwtSecretSourceTest(unittest.TestCase):
    def test_generated_secret_stays_runtime_generated_across_modules_when_persistence_is_unavailable(self):
        first = types.SimpleNamespace(JWT_SECRET="")
        second = types.SimpleNamespace(JWT_SECRET="")
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(runtime_patch, "_database_secret", return_value=""):
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

    def test_real_environment_secret_is_preferred_and_persistent_across_modules(self):
        secret = "render-environment-secret-" + "x" * 40
        first = types.SimpleNamespace(JWT_SECRET="")
        second = types.SimpleNamespace(JWT_SECRET="")
        with mock.patch.dict(os.environ, {"JWT_SECRET": secret}, clear=True), mock.patch.object(runtime_patch, "_database_secret") as database_secret:
            runtime_patch.install(first)
            runtime_patch.install(second)

            database_secret.assert_not_called()
            self.assertEqual(first.JWT_SECRET, secret)
            self.assertEqual(second.JWT_SECRET, secret)
            self.assertEqual(first.CHURVOX_JWT_SECRET_SOURCE, "environment")
            self.assertEqual(second.CHURVOX_JWT_SECRET_SOURCE, "environment")
            self.assertTrue(first.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertTrue(second.CHURVOX_JWT_SECRET_PERSISTENT)
            self.assertEqual(os.environ[runtime_patch.SOURCE_ENV], "environment")
            self.assertEqual(os.environ[runtime_patch.PERSISTENT_ENV], "1")

    def test_database_secret_is_created_once_and_reused(self):
        collection = FakeCollection()
        database = FakeDatabase(collection)
        client = FakeMongoClient(database)
        env = {"MONGO_URL": "mongodb://example.invalid/churvox", "DB_NAME": "churvox"}

        with mock.patch.dict(os.environ, env, clear=True), mock.patch.object(runtime_patch, "_new_mongo_client", return_value=client):
            first = runtime_patch._database_secret()
            second = runtime_patch._database_secret()

        self.assertTrue(runtime_patch._strong(first))
        self.assertEqual(second, first)
        self.assertEqual(collection.document["_id"], runtime_patch.DATABASE_DOCUMENT_ID)
        self.assertEqual(collection.document["source"], "database")
        self.assertEqual(client.last_database_name, "churvox")
        self.assertEqual(database.last_collection_name, runtime_patch.DATABASE_COLLECTION)
        self.assertTrue(client.closed)

    def test_database_secret_is_classified_as_restart_persistent(self):
        secret = "mongo-backed-secret-" + "y" * 50
        first = types.SimpleNamespace(JWT_SECRET="")
        second = types.SimpleNamespace(JWT_SECRET="")
        env = {"MONGO_URL": "mongodb://example.invalid/churvox", "DB_NAME": "churvox"}

        with mock.patch.dict(os.environ, env, clear=True), mock.patch.object(runtime_patch, "_database_secret", return_value=secret):
            runtime_patch.install(first)
            runtime_patch.install(second)
            checks = launch_security._checks(second)

        self.assertEqual(first.JWT_SECRET, secret)
        self.assertEqual(second.JWT_SECRET, secret)
        self.assertEqual(first.CHURVOX_JWT_SECRET_SOURCE, "database")
        self.assertEqual(second.CHURVOX_JWT_SECRET_SOURCE, "database")
        self.assertTrue(first.CHURVOX_JWT_SECRET_PERSISTENT)
        self.assertTrue(second.CHURVOX_JWT_SECRET_PERSISTENT)
        self.assertTrue(checks["jwt_secret_persistent"]["ok"])
        self.assertIn("Mongo-backed", checks["jwt_secret_persistent"]["detail"])
        self.assertEqual(os.environ[runtime_patch.PERSISTENT_ENV], "1")


if __name__ == "__main__":
    unittest.main()
