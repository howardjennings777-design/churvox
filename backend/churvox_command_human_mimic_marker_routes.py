from fastapi import APIRouter


HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"
HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"
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
            "roles": ROLE_NAMES,
            "preflight": {
                "source_validation": True,
                "business_isolation": True,
                "weak_candidate_rejection": True,
                "historical_money_reference_only": True,
                "required_fields_block_approval": True,
                "secret_redaction": True,
            },
            "safety": HUMAN_MIMIC_SAFETY,
        }

    return router
