#!/usr/bin/env python3
"""Harden Job Done startup mounting and add unambiguous deploy fingerprints."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    return text.replace(old, new, 1)


def patch_job_done_routes():
    path = ROOT / "backend/churvox_job_done_routes.py"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'OPEN_COMMAND_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]\n',
        'OPEN_COMMAND_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]\nJOB_DONE_REALITY_BUILD = "job-done-reality-v2-20260714"\nJOB_DONE_ROUTE_GUARD = "startup-mount-confirmed-v1"\n',
        "Job Done build constants",
    )
    text = replace_once(
        text,
        '''def build_job_done_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now():
''',
        '''def build_job_done_router(db, get_current_user, ObjectId):
    router = APIRouter()

    @router.get("/job-done/marker")
    async def job_done_marker():
        return {
            "success": True,
            "build": JOB_DONE_REALITY_BUILD,
            "route_guard": JOB_DONE_ROUTE_GUARD,
            "persisted_closeouts": True,
            "owner_approval_required": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_file_tax": True,
            "no_auto_pay": True,
        }

    def now():
''',
        "public Job Done marker",
    )
    path.write_text(text, encoding="utf-8")


def patch_command_marker():
    path = ROOT / "backend/churvox_command_human_mimic_marker_routes.py"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'HUMAN_MIMIC_SUMMARY_GUARD = "strict-surviving-queue-summary-v1"\n',
        'HUMAN_MIMIC_SUMMARY_GUARD = "strict-surviving-queue-summary-v1"\nJOB_DONE_REALITY_BUILD = "job-done-reality-v2-20260714"\nJOB_DONE_ROUTE_GUARD = "startup-mount-confirmed-v1"\n',
        "Command marker Job Done build",
    )
    text = replace_once(
        text,
        '            "summary_guard": HUMAN_MIMIC_SUMMARY_GUARD,\n',
        '            "summary_guard": HUMAN_MIMIC_SUMMARY_GUARD,\n            "job_done_reality_build": JOB_DONE_REALITY_BUILD,\n            "job_done_route_guard": JOB_DONE_ROUTE_GUARD,\n',
        "Command marker Job Done fields",
    )
    path.write_text(text, encoding="utf-8")


def patch_frontend_entry():
    path = ROOT / "frontend/src/index.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "import './runtime/churvoxBusinessSystemDashboardAnchorRuntime';\n\nfunction preconnectBackend() {\n",
        "import './runtime/churvoxBusinessSystemDashboardAnchorRuntime';\n\nconst CHURVOX_DEPLOY_BUILD = 'churvox-job-done-live-v2-20260714';\nif (typeof window !== 'undefined') window.__CHURVOX_DEPLOY_BUILD__ = CHURVOX_DEPLOY_BUILD;\n\nfunction preconnectBackend() {\n",
        "frontend deploy fingerprint",
    )
    path.write_text(text, encoding="utf-8")


def patch_usercustomize(relative_path):
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '                self.state.churvox_real_ai_operator_routes_installed = True\n',
        '                self.state.churvox_real_ai_operator_routes_installing = True\n',
        f"{relative_path} early installed flag",
    )
    marker_include = '                original_include_router(self, build_command_human_mimic_marker_router(), prefix="/api")\n'
    early_job_done = marker_include + '''                # Mount Job Done immediately after the public build marker so later optional routers cannot block it.
                job_done_get_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/closeouts"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not job_done_get_mounted:
                    original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")
'''
    text = replace_once(text, marker_include, early_job_done, f"{relative_path} early Job Done mount")

    old_late_variants = [
        '''                # Persisted closeouts and Money Radar must be registered before the approval executor.
                original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")
''',
        '''                # Job Done owns persisted closeouts and Money Radar reads before Command applies any approved drafts.
                original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")
''',
    ]
    removed = False
    for old in old_late_variants:
        if old in text:
            text = text.replace(old, "", 1)
            removed = True
            break
    if not removed:
        raise RuntimeError(f"Could not find {relative_path} late Job Done mount")

    text = replace_once(
        text,
        '                original_include_router(self, build_command_router(local_db, local_get_current_user, ObjectId), prefix="/api")\n                return result\n',
        '''                original_include_router(self, build_command_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                job_done_get_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/closeouts"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                job_done_marker_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/marker"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not job_done_get_mounted or not job_done_marker_mounted:
                    raise RuntimeError("Job Done routes did not mount during Churvox startup")
                self.state.churvox_job_done_routes_installed = True
                self.state.churvox_real_ai_operator_routes_installed = True
                self.state.churvox_real_ai_operator_routes_installing = False
                return result
''',
        f"{relative_path} verified installed flag",
    )
    text = replace_once(
        text,
        '        except Exception as exc:\n            print(f"Churvox real AI/Command route install skipped: {exc}", file=sys.stderr)\n',
        '        except Exception as exc:\n            self.state.churvox_real_ai_operator_routes_installed = False\n            self.state.churvox_real_ai_operator_routes_installing = False\n            print(f"Churvox real AI/Command route install skipped: {exc}", file=sys.stderr)\n',
        f"{relative_path} retry state reset",
    )
    path.write_text(text, encoding="utf-8")


def patch_contract():
    path = ROOT / "scripts/churvox-job-done-reality-contract.py"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '        \'@router.post("/job-done/scan")\',\n',
        '        \'@router.get("/job-done/marker")\',\n        \'@router.post("/job-done/scan")\',\n',
        "Job Done marker route contract",
    )
    text = replace_once(
        text,
        '        \'"business_id": business_id\',\n',
        '        \'JOB_DONE_REALITY_BUILD = "job-done-reality-v2-20260714"\',\n        \'JOB_DONE_ROUTE_GUARD = "startup-mount-confirmed-v1"\',\n        \'"business_id": business_id\',\n',
        "Job Done marker constants contract",
    )
    text = replace_once(
        text,
        '    for hook in [backend_hook, root_hook]:\n        require(hook, "build_job_done_router", "Job Done runtime registration")\n        require(hook, "build_job_done_router(local_db, local_get_current_user, ObjectId)", "Job Done router install")\n',
        '''    for hook in [backend_hook, root_hook]:
        require(hook, "build_job_done_router", "Job Done runtime registration")
        require(hook, "Mount Job Done immediately after the public build marker", "early Job Done mount")
        require(hook, 'getattr(route, "path", "") == "/api/job-done/closeouts"', "Job Done closeout mount verification")
        require(hook, 'getattr(route, "path", "") == "/api/job-done/marker"', "Job Done marker mount verification")
        require(hook, "self.state.churvox_job_done_routes_installed = True", "verified Job Done startup state")
        require(hook, "self.state.churvox_real_ai_operator_routes_installed = True", "late installed flag")
        require(hook, "self.state.churvox_real_ai_operator_routes_installed = False", "failed install retry reset")
''',
        "startup mount contract",
    )
    text = replace_once(
        text,
        '    api = read("frontend/src/churvox-office-lab/OfficeTeamJobDoneApi.js")\n',
        '    command_marker = read("backend/churvox_command_human_mimic_marker_routes.py")\n    require(command_marker, \'"job_done_reality_build": JOB_DONE_REALITY_BUILD\', "public backend deploy fingerprint")\n    require(command_marker, \'"job_done_route_guard": JOB_DONE_ROUTE_GUARD\', "public route guard fingerprint")\n    frontend_entry = read("frontend/src/index.js")\n    require(frontend_entry, "churvox-job-done-live-v2-20260714", "eager frontend deploy fingerprint")\n\n    api = read("frontend/src/churvox-office-lab/OfficeTeamJobDoneApi.js")\n',
        "deploy fingerprint contract",
    )
    path.write_text(text, encoding="utf-8")


def main():
    patch_job_done_routes()
    patch_command_marker()
    patch_frontend_entry()
    patch_usercustomize("usercustomize.py")
    patch_usercustomize("backend/usercustomize.py")
    patch_contract()
    print("Job Done live mount repair applied.")


if __name__ == "__main__":
    main()
