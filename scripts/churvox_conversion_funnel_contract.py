#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import churvox_conversion_funnel_patch as funnel


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    check(funnel.path_event("/") == "homepage_viewed", "Homepage stage was not recognised")
    check(funnel.path_event("/pricing/") == "pricing_viewed", "Pricing stage was not recognised")
    check(funnel.path_event("/signup/?plan=operator") == "signup_started", "Signup stage was not recognised")
    check(funnel.path_event("/dashboard") == "", "Internal app pages must not become public funnel stages")

    check(funnel.verified_user({"email_verified": True}), "Verified account was not recognised")
    check(funnel.verified_user({"email_verified_at": "2026-07-28T00:00:00Z"}), "Verified timestamp was not recognised")
    check(not funnel.verified_user({"email_verified": False}), "Unverified account was incorrectly counted")

    check(funnel.actor_key({"business_id": "biz-1"}) == "business:biz-1", "Business actor key was not stable")
    check(funnel.actor_key({"owner_email": "owner@example.nz"}) == "email:owner@example.nz", "Email actor fallback was not stable")
    check(funnel.internal_row({"email": "hello@churvox.com"}), "Platform owner traffic must be excluded")
    check(funnel.internal_row({"email": "tester@example.com"}), "Example/test traffic must be excluded")
    check(not funnel.internal_row({"email": "owner@realbusiness.co.nz", "business_name": "Real Property Care"}), "Real business traffic was incorrectly excluded")

    check(funnel.stage_rate(50, 100) == 50.0, "Comparable stage rate was wrong")
    check(funnel.stage_rate(120, 100) is None, "Historical overlap must not produce a fake rate over 100 percent")
    check(funnel.stage_rate(1, 0) is None, "Missing denominator must not produce a fake rate")

    check(
        funnel.ALLOWED_EVENTS == {
            "homepage_viewed",
            "pricing_viewed",
            "signup_started",
            "email_verified",
            "first_client_created",
            "first_job_created",
            "first_invoice_created",
        },
        "Funnel event allowlist changed unexpectedly",
    )

    print(json.dumps({
        "success": True,
        "contract": "real first-party Churvox conversion funnel",
        "checks": [
            "public route stages",
            "verified account evidence",
            "stable business actors",
            "internal/test exclusion",
            "no fake percentages",
            "locked event allowlist",
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
