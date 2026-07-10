#!/usr/bin/env python3
from __future__ import annotations

import asyncio

import churvox_mimic_full_test as suite


_original_build_seed = suite.build_seed


def build_seed_with_true_weak_history(business_a, business_b):
    seed, ids = _original_build_seed(business_a, business_b)
    # Keep the current weak recurring record in the future so only the two past
    # visits are eligible history. One historical gap is deliberately not enough
    # for strict v3 to infer a recurring cycle.
    for row in seed.get("jobs", []):
        if str(row.get("_id")) == str(ids["weak_repeat"]):
            row["scheduled_date"] = suite.iso(5)
            break
    return seed, ids


suite.build_seed = build_seed_with_true_weak_history


if __name__ == "__main__":
    asyncio.run(suite.main())
