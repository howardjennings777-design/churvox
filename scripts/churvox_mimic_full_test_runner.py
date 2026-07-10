#!/usr/bin/env python3
from __future__ import annotations

import asyncio

import churvox_mimic_full_test as suite
from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
from churvox_command_human_mimic_source_normalizer import _normalize_job, _normalize_timer


_original_build_seed = suite.build_seed


def build_seed_with_true_edge_cases(business_a, business_b):
    seed, ids = _original_build_seed(business_a, business_b)

    # Keep the current weak recurring record in the future so only the two past
    # visits are eligible history. One historical gap is deliberately not enough
    # for strict v3 to infer a recurring cycle.
    for row in seed.get("jobs", []):
        if str(row.get("_id")) == str(ids["weak_repeat"]):
            row["scheduled_date"] = suite.iso(5)
        elif str(row.get("_id")) == str(ids["incomplete_job"]):
            # This record is intentionally labelled incomplete but already has
            # setup fields. It must not become an invoice/proof decision, and it
            # should not create a separate setup decision either.
            row["scheduled_date"] = suite.iso(2)
            row["worker_name"] = "Cam"

    for row in seed.get("messages", []):
        if str(row.get("_id")) == str(ids["message_duplicate_memory"]):
            # Isolate duplicate-memory logic from reply logic: this is an
            # internal imported note, not an inbound customer request.
            row["direction"] = "internal_note"
            row["status"] = "closed"

    return seed, ids


suite.build_seed = build_seed_with_true_edge_cases


async def run():
    suite.check(
        "legacy incomplete status is normalized before reasoning",
        _normalize_job({"status": "incomplete"}).get("status") == "open",
    )
    suite.check(
        "legacy seconds timer is normalized to hours",
        _normalize_timer({"duration_seconds": 3600}).get("duration_hours") == 1,
    )
    await suite.main()

    marker_router = build_command_human_mimic_marker_router()
    marker = suite.endpoint(marker_router, "/command/human-mimic-marker", "GET")
    marker_result = await marker()
    suite.check(
        "deployment marker proves linked-invoice post-guard",
        marker_result.get("post_guard") == "linked-invoice-source-recheck-v1"
        and (marker_result.get("preflight") or {}).get("linked_invoice_postguard") is True,
    )


if __name__ == "__main__":
    asyncio.run(run())
