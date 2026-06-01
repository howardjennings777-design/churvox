# CHURVOX_LOCKED_BACKEND_PLAN_RULES_20260602
# Single backend source for Churvox plan names, pricing, caps and feature flags.
# Backend billing keys stay: solo, team, pro, enterprise.
# Customer-facing names are: Start, Crew, Operator, Command.

PLAN_ORDER = {
    "solo": 1,
    "team": 2,
    "pro": 3,
    "enterprise": 4,
}

PLAN_DISPLAY_NAMES = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}

PLAN_FEATURES = {
    "solo": {
        "name": "Start",
        "price": 39,
        "max_clients": 20,
        "included_users": 1,
        "team_management": False,
        "worker_app": False,
        "csv_team_import": False,
        "csv_client_import": False,
        "recurring_jobs": False,
        "ai_operator": False,
        "approval_queue": False,
        "automation": False,
        "myob_sync": False,
        "myob_addon_available": False,
        "myob_included": False,
        "payroll_workspace": False,
        "enterprise_user_blocks": False,
    },
    "team": {
        "name": "Crew",
        "price": 89,
        "max_clients": 30,
        "included_users": 5,
        "team_management": True,
        "worker_app": True,
        "csv_team_import": True,
        "csv_client_import": False,
        "recurring_jobs": False,
        "ai_operator": False,
        "approval_queue": False,
        "automation": False,
        "myob_sync": False,
        "myob_addon_available": False,
        "myob_included": False,
        "payroll_workspace": False,
        "enterprise_user_blocks": False,
    },
    "pro": {
        "name": "Operator",
        "price": 149,
        "max_clients": 40,
        "included_users": 15,
        "team_management": True,
        "worker_app": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "ai_operator": True,
        "approval_queue": True,
        "automation": True,
        "myob_sync": False,
        "myob_addon_available": True,
        "myob_included": False,
        "payroll_workspace": False,
        "enterprise_user_blocks": False,
    },
    "enterprise": {
        "name": "Command",
        "price": 299,
        "max_clients": 50,
        "included_users": 50,
        "team_management": True,
        "worker_app": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "ai_operator": True,
        "approval_queue": True,
        "automation": True,
        "myob_sync": True,
        "myob_addon_available": True,
        "myob_included": True,
        "payroll_workspace": True,
        "enterprise_user_blocks": True,
        "extra_user_block_size": 50,
        "extra_user_block_price": 99,
    },
}

def normalize_plan(plan):
    value = str(plan or "").strip().lower()
    if not value or value in ("null", "undefined", "none"):
        return None
    if value in PLAN_ORDER:
        return value
    return "solo"

def plan_rank(plan):
    normalized = normalize_plan(plan)
    return PLAN_ORDER.get(normalized, 0)

def has_plan_access(current_plan, required_plan):
    return plan_rank(current_plan) >= plan_rank(required_plan)

def get_plan_features(plan):
    normalized = normalize_plan(plan)
    return PLAN_FEATURES.get(normalized, PLAN_FEATURES["solo"])

def get_plan_display_name(plan):
    normalized = normalize_plan(plan)
    return PLAN_DISPLAY_NAMES.get(normalized, "No plan")

def can_use_feature(plan, feature_key):
    return bool(get_plan_features(plan).get(feature_key, False))

def get_max_clients(plan):
    return int(get_plan_features(plan).get("max_clients", 20))

def get_included_users(plan):
    return int(get_plan_features(plan).get("included_users", 1))

# CHURVOX_TOP_TIER_BACKEND_ENDPOINTS_PLAN_RULES_HOOK_20260528
# Fallback startup hook: server.py imports this module, so retry route registration
# after server.py has finished creating app/db/dependencies.
def _churvox_try_register_top_tier_routes(attempt=0):
    try:
        import importlib
        server = importlib.import_module("server")
        routes = importlib.import_module("churvox_top_tier_routes")
        if routes.register(server):
            return
    except Exception as exc:
        if attempt >= 12:
            print("CHURVOX_TOP_TIER_PLAN_RULES_HOOK_FAILED", repr(exc))
            return
    try:
        import threading
        threading.Timer(0.25, _churvox_try_register_top_tier_routes, kwargs={"attempt": attempt + 1}).start()
    except Exception as exc:
        print("CHURVOX_TOP_TIER_PLAN_RULES_TIMER_FAILED", repr(exc))

_churvox_try_register_top_tier_routes()
