from fastapi import APIRouter


HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v2"
HUMAN_MIMIC_GUARD = "human-mimic-scan-guard-v2"
HUMAN_MIMIC_SAFETY = "Owner approval required. Nothing was sent, synced, charged or changed."


def build_command_human_mimic_marker_router():
    router = APIRouter()

    @router.get("/command/human-mimic-marker")
    async def human_mimic_marker():
        return {
            "success": True,
            "version": HUMAN_MIMIC_VERSION,
            "guard": HUMAN_MIMIC_GUARD,
            "roles": [
                "Office Manager",
                "Receptionist",
                "Bookkeeper",
                "Accountant",
                "Payroll Clerk",
                "Client Memory",
                "Quality Checker",
                "Operations Manager",
            ],
            "safety": HUMAN_MIMIC_SAFETY,
        }

    return router
