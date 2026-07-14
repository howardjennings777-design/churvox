import asyncio
from copy import deepcopy
import unittest

from bson import ObjectId
from fastapi import FastAPI, HTTPException

from backend.churvox_command_apply_routes import build_command_apply_router
from backend.churvox_job_done_routes import build_job_done_router
from backend.churvox_worker_complete_elapsed_patch import _seed_job_done


OWNER = {
    "id": "owner-job-done-test",
    "business_id": "business-job-done-test",
    "role": "owner",
}


async def owner_user(_request):
    return dict(OWNER)


def comparable(value):
    if isinstance(value, ObjectId):
        return str(value)
    return value


def field_value(document, path):
    value = document
    for part in str(path).split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def matches(document, query):
    for key, expected in (query or {}).items():
        if key == "$or":
            if not any(matches(document, item) for item in expected):
                return False
            continue
        if key == "$and":
            if not all(matches(document, item) for item in expected):
                return False
            continue
        actual = field_value(document, key)
        if isinstance(expected, dict) and "$in" in expected:
            if not any(comparable(actual) == comparable(item) for item in expected["$in"]):
                return False
            continue
        if comparable(actual) != comparable(expected):
            return False
    return True


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)
        self.maximum = None

    def sort(self, key, direction=-1):
        reverse = int(direction or -1) < 0
        self.rows.sort(key=lambda row: (field_value(row, key) is None, str(field_value(row, key) or "")), reverse=reverse)
        return self

    def limit(self, maximum):
        self.maximum = int(maximum)
        return self

    async def to_list(self, maximum):
        limit = self.maximum if self.maximum is not None else int(maximum)
        return [deepcopy(item) for item in self.rows[:limit]]


class FakeWriteResult:
    def __init__(self, inserted_id=None, inserted_ids=None):
        self.inserted_id = inserted_id
        self.inserted_ids = inserted_ids or []


class FakeCollection:
    def __init__(self):
        self.rows = []
        self.indexes = []

    async def create_index(self, fields, **options):
        self.indexes.append((fields, options))
        return options.get("name") or "index"

    def find(self, query=None):
        return FakeCursor([item for item in self.rows if matches(item, query or {})])

    async def find_one(self, query=None):
        for item in self.rows:
            if matches(item, query or {}):
                return deepcopy(item)
        return None

    async def insert_one(self, document):
        stored = deepcopy(document)
        stored.setdefault("_id", ObjectId())
        self.rows.append(stored)
        return FakeWriteResult(inserted_id=stored["_id"])

    async def insert_many(self, documents):
        ids = []
        for document in documents:
            result = await self.insert_one(document)
            ids.append(result.inserted_id)
        return FakeWriteResult(inserted_ids=ids)

    async def update_one(self, query, update, upsert=False):
        target = None
        for item in self.rows:
            if matches(item, query or {}):
                target = item
                break
        inserted = False
        if target is None and upsert:
            target = {}
            for key, value in (query or {}).items():
                if not str(key).startswith("$") and not isinstance(value, dict):
                    target[key] = deepcopy(value)
            target["_id"] = ObjectId()
            self.rows.append(target)
            inserted = True
        if target is None:
            return FakeWriteResult()
        if inserted:
            for key, value in (update.get("$setOnInsert") or {}).items():
                target[key] = deepcopy(value)
        for key, value in (update.get("$set") or {}).items():
            target[key] = deepcopy(value)
        for key, value in (update.get("$push") or {}).items():
            target.setdefault(key, []).append(deepcopy(value))
        return FakeWriteResult()


class FakeDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        return self.collection(name)

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self.collection(name)

    def collection(self, name):
        if name not in self.collections:
            self.collections[name] = FakeCollection()
        return self.collections[name]


def route_for(app, path, method):
    matches_found = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]
    if len(matches_found) != 1:
        raise AssertionError(f"Expected one {method} route for {path}, found {len(matches_found)}")
    return matches_found[0]


def make_app(db):
    app = FastAPI()
    app.include_router(build_job_done_router(db, owner_user, ObjectId), prefix="/api")
    app.include_router(build_command_apply_router(db, owner_user, ObjectId), prefix="/api")
    return app


def completed_job(**changes):
    document = {
        "_id": ObjectId(),
        "business_id": OWNER["business_id"],
        "client_id": "client-one",
        "worker_id": "worker-one",
        "title": "Henderson hedge trim",
        "status": "completed",
        "completed_at": "2026-07-14T04:00:00Z",
        "proof_required": True,
        "hours": 2.5,
        "price": 280,
        "recurring": True,
        "next_date": "2026-07-28",
    }
    document.update(changes)
    return document


class JobDoneRealityTest(unittest.TestCase):
    def test_missing_proof_creates_only_a_proof_hold_and_repeat_approval_is_idempotent(self):
        async def scenario():
            db = FakeDatabase()
            job = completed_job()
            await db.jobs.insert_one(job)
            app = make_app(db)

            scan = route_for(app, "/api/job-done/scan", "POST")
            scan_result = await scan.endpoint(object())
            self.assertEqual(scan_result["count"], 1)
            closeout = scan_result["closeouts"][0]
            self.assertEqual(closeout["proof"]["status"], "missing")

            prepare = route_for(app, "/api/job-done/closeouts/{closeout_id}/prepare", "POST")
            prepared = await prepare.endpoint(closeout_id=closeout["id"], request=object(), payload={"intent": "full_closeout"})
            slip = prepared["slip"]
            self.assertEqual(slip["source_type"], "job_done")
            self.assertEqual(slip["payload"]["closeout_revision"], closeout["source_revision"])

            approve = route_for(app, "/api/command/slips/{slip_id}/approve", "POST")
            approval = await approve.endpoint(
                slip_id=slip["id"],
                request=object(),
                payload={
                    "action": "Approve closeout drafts",
                    "approved_form": slip["payload"]["prepared_form"],
                },
            )
            execution = approval["result"]["execution"]
            self.assertTrue(execution["applied"])
            self.assertEqual(execution["type"], "job_done_proof_hold")
            self.assertIn("quality_review_id", execution["artifacts"])
            self.assertIn("worker_proof_request_id", execution["artifacts"])
            self.assertNotIn("invoice_draft_id", execution["artifacts"])
            self.assertNotIn("message_draft_id", execution["artifacts"])
            self.assertNotIn("accounting_review_id", execution["artifacts"])

            stored = await db.job_closeouts.find_one({"_id": ObjectId(closeout["id"])})
            self.assertEqual(stored["status"], "waiting_proof")
            counts_before = {name: len(collection.rows) for name, collection in db.collections.items()}

            repeated = await approve.endpoint(
                slip_id=slip["id"],
                request=object(),
                payload={"action": "Approve closeout drafts"},
            )
            self.assertTrue(repeated["idempotent"])
            counts_after = {name: len(collection.rows) for name, collection in db.collections.items()}
            self.assertEqual(counts_before, counts_after)

        asyncio.run(scenario())

    def test_stale_command_revision_is_rejected_before_artifacts_are_created(self):
        async def scenario():
            db = FakeDatabase()
            await db.jobs.insert_one(completed_job(proof_required=False, completion_photos=["proof.jpg"]))
            app = make_app(db)
            scan = route_for(app, "/api/job-done/scan", "POST")
            closeout = (await scan.endpoint(object()))["closeouts"][0]
            prepare = route_for(app, "/api/job-done/closeouts/{closeout_id}/prepare", "POST")
            slip = (await prepare.endpoint(closeout_id=closeout["id"], request=object(), payload={}))["slip"]
            await db.job_closeouts.update_one(
                {"_id": ObjectId(closeout["id"])},
                {"$set": {"source_revision": "changed-after-command"}},
            )
            approve = route_for(app, "/api/command/slips/{slip_id}/approve", "POST")
            with self.assertRaises(HTTPException) as captured:
                await approve.endpoint(
                    slip_id=slip["id"],
                    request=object(),
                    payload={"action": "Approve closeout drafts", "approved_form": slip["payload"]["prepared_form"]},
                )
            self.assertEqual(captured.exception.status_code, 409)
            self.assertEqual(len(db.invoices.rows), 0)
            self.assertEqual(len(db.accounting_reviews.rows), 0)

        asyncio.run(scenario())

    def test_invoice_linking_requires_job_or_invoice_id_not_only_a_shared_client(self):
        async def scenario():
            db = FakeDatabase()
            job = completed_job(proof_required=False, completion_photos=["proof.jpg"])
            await db.jobs.insert_one(job)
            unrelated = {
                "_id": ObjectId(),
                "business_id": OWNER["business_id"],
                "client_id": job["client_id"],
                "status": "draft",
                "total": 999,
            }
            await db.invoices.insert_one(unrelated)
            app = make_app(db)
            scan = route_for(app, "/api/job-done/scan", "POST")
            first = (await scan.endpoint(object()))["closeouts"][0]
            self.assertEqual(first["invoice"]["status"], "missing")

            linked = {
                "_id": ObjectId(),
                "business_id": OWNER["business_id"],
                "job_id": str(job["_id"]),
                "client_id": job["client_id"],
                "status": "draft",
                "total": 280,
            }
            await db.invoices.insert_one(linked)
            second = (await scan.endpoint(object()))["closeouts"][0]
            self.assertEqual(second["invoice"]["invoice_id"], str(linked["_id"]))
            self.assertEqual(second["invoice"]["amount"], 280)

        asyncio.run(scenario())

    def test_repeated_worker_completion_does_not_reopen_an_approved_closeout(self):
        async def scenario():
            db = FakeDatabase()
            job = completed_job(proof_required=False, completion_photos=["proof.jpg"])
            closeout_id = ObjectId()
            await db.job_closeouts.insert_one({
                "_id": closeout_id,
                "business_id": OWNER["business_id"],
                "job_collection": "jobs",
                "job_id": str(job["_id"]),
                "status": "approved",
                "closeout_state": "approved",
                "execution": {"applied": True, "artifacts": {"invoice_draft_id": "invoice-one"}},
            })
            stored = await _seed_job_done(db, OWNER, job, "2026-07-14T05:00:00Z")
            self.assertEqual(stored["status"], "approved")
            self.assertEqual(stored["closeout_state"], "approved")
            self.assertTrue(stored["execution"]["applied"])

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()
