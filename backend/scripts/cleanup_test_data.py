#!/usr/bin/env python3
"""Safe cleanup tool for obvious fake/test/demo data.

Dry run:
  python backend/scripts/cleanup_test_data.py

Delete confirmed matches:
  CONFIRM_CLEAN_TEST_DATA=yes python backend/scripts/cleanup_test_data.py
"""

import os
import re
from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from pymongo import MongoClient

SAFE_KEYWORDS: Sequence[str] = (
    "test",
    "demo",
    "fake",
    "dummy",
    "sample",
    "certification",
    "deep audit",
    "audit job",
    "test job",
    "test client",
    "test invoice",
    "test quote",
    "example",
    "lorem",
    "asdf",
    "qwerty",
)

SCANNED_FIELDS: Sequence[str] = (
    "name",
    "client_name",
    "customer_name",
    "business_name",
    "title",
    "email",
    "notes",
    "description",
    "job_description",
    "address",
    "status",
    "status_message",
    "message",
)

COLLECTIONS_TO_SCAN: Sequence[str] = (
    "users",
    "clients",
    "jobs",
    "quotes",
    "invoices",
    "workers",
    "team",
    "team_members",
    "notifications",
    "automation_runs",
)

OWNER_EMAIL = "hello@churvox.com"


def _normalize_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def _extract_searchable_strings(doc: Dict) -> Iterable[Tuple[str, str]]:
    for field in SCANNED_FIELDS:
        if field in doc:
            text = _normalize_text(doc.get(field)).strip()
            if text:
                yield field, text


def _find_match_reason(doc: Dict) -> Optional[str]:
    for field, text in _extract_searchable_strings(doc):
        lowered = text.lower()
        for keyword in SAFE_KEYWORDS:
            pattern = re.compile(r"\\b" + re.escape(keyword.lower()) + r"\\b")
            if pattern.search(lowered):
                return f"keyword '{keyword}' in field '{field}'"
    return None


def _label_for_doc(doc: Dict) -> str:
    for field in ("name", "title", "client_name", "customer_name", "business_name", "email"):
        value = _normalize_text(doc.get(field)).strip()
        if value:
            return value
    return "<unlabeled>"


def _is_deletable_user(doc: Dict, reason: str) -> bool:
    email = _normalize_text(doc.get("email")).strip().lower()
    if email == OWNER_EMAIL:
        return False
    return bool(reason)


def main() -> None:
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")

    if not mongo_url:
        raise SystemExit("MONGO_URL is required")
    if not db_name:
        raise SystemExit("DB_NAME is required")

    delete_mode = os.getenv("CONFIRM_CLEAN_TEST_DATA", "").strip().lower() == "yes"
    mode_label = "DELETE" if delete_mode else "DRY RUN"

    client = MongoClient(mongo_url)
    db = client[db_name]

    existing_collections = set(db.list_collection_names())
    summary_matches: Dict[str, int] = defaultdict(int)
    summary_deleted: Dict[str, int] = defaultdict(int)

    print(f"Mode: {mode_label}")
    print(f"Database: {db_name}")
    print("-" * 80)

    for coll_name in COLLECTIONS_TO_SCAN:
        if coll_name not in existing_collections:
            continue

        collection = db[coll_name]
        matches: List[Tuple[object, str, str]] = []

        for doc in collection.find({}, projection={field: 1 for field in SCANNED_FIELDS} | {"_id": 1}):
            reason = _find_match_reason(doc)
            if not reason:
                continue

            if coll_name == "users" and not _is_deletable_user(doc, reason):
                continue

            matches.append((doc.get("_id"), reason, _label_for_doc(doc)))

        summary_matches[coll_name] = len(matches)

        if not matches:
            continue

        print(f"Collection: {coll_name}")
        for doc_id, reason, label in matches:
            print(f"  - id={doc_id} | reason={reason} | label={label}")
        print(f"  Total matches in {coll_name}: {len(matches)}")

        if delete_mode:
            ids_to_delete = [doc_id for doc_id, _, _ in matches if doc_id is not None]
            if ids_to_delete:
                result = collection.delete_many({"_id": {"$in": ids_to_delete}})
                summary_deleted[coll_name] = result.deleted_count
                print(f"  Deleted from {coll_name}: {result.deleted_count}")
        print("-" * 80)

    print("Final summary")
    total_matches = sum(summary_matches.values())
    total_deleted = sum(summary_deleted.values())

    if summary_matches:
        for coll_name in COLLECTIONS_TO_SCAN:
            if coll_name in summary_matches:
                print(f"  {coll_name}: matches={summary_matches[coll_name]}")
    else:
        print("  No target collections found.")

    print(f"  Total matched docs: {total_matches}")
    print(f"  Total deleted docs: {total_deleted}")
    print(f"  Delete mode enabled: {delete_mode}")


if __name__ == "__main__":
    main()
