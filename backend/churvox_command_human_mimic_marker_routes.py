from fastapi import APIRouter


HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"
HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"
HUMAN_MIMIC_POST_GUARD = "linked-invoice-source-recheck-v1"
HUMAN_MIMIC_SOURCE_NORMALIZATION = "legacy-job-status-and-timer-units-v1"
HUMAN_MIMIC_ROLE_SCHEMA_GUARD = "role-required-evidence-v1"
HUMAN_MIMIC_SUMMARY_GUARD = "strict-surviving-queue-summary-v1"
JOB_DONE_REALITY_BUILD = "job-done-reality-v2-20260714"
JOB_DONE_ROUTE_GUARD = "startup-mount-confirmed-v1"
HUMAN_MIMIC_SAFETY = "Owner approval required. Nothing was sent, synced, charged or changed."


ROLE_NAMES = [
    "Office Manager",
    "Receptionist",
    "Bookkeeper",
    "Accountant",
    "Payroll Clerk",
    "Client Memory",
    "Quality Checker",
    "Operations Manager",
]


def build_command_human_mimic_marker_router():
    router = APIRouter()

    @router.get("/command/human-mimic-marker")
    async def human_mimic_marker():
        return {
            "success": True,
            "version": HUMAN_MIMIC_VERSION,
            "guard": HUMAN_MIMIC_GUARD,
            "post_guard": HUMAN_MIMIC_POST_GUARD,
            "source_normalization": HUMAN_MIMIC_SOURCE_NORMALIZATION,
            "role_schema_guard": HUMAN_MIMIC_ROLE_SCHEMA_GUARD,
            "summary_guard": HUMAN_MIMIC_SUMMARY_GUARD,
            "job_done_reality_build": JOB_DONE_REALITY_BUILD,
            "job_done_route_guard": JOB_DONE_ROUTE_GUARD,
            "roles": ROLE_NAMES,
            "preflight": {
                "source_validation": True,
                "source_normalization": True,
                "business_isolation": True,
                "weak_candidate_rejection": True,
                "historical_money_reference_only": True,
                "required_fields_block_approval": True,
                "role_specific_required_evidence": True,
                "secret_redaction": True,
                "linked_invoice_postguard": True,
                "manager_summaries_use_strict_queue": True,
            },
            "safety": HUMAN_MIMIC_SAFETY,
        }

    return router
