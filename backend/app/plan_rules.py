PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}

PLAN_DISPLAY_NAMES = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}

PLAN_ORDER = {
    "solo": 1,
    "team": 2,
    "pro": 3,
    "enterprise": 4,
}

PLAN_FEATURES = {
    "solo": {
        "name": "Start",
        "public_name": "Start",
        "price": 39,
        "max_clients": 20,
        "team_management": False,
        "csv_team_import": False,
        "csv_client_import": False,
        "recurring_jobs": False,
        "ai_operator_actions": False,
        "myob_sync": False,
        "enterprise_user_blocks": False,
        "included_users": 1,
        "active_team_members": 1,
    },
    "team": {
        "name": "Crew",
        "public_name": "Crew",
        "price": 89,
        "max_clients": 30,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": False,
        "recurring_jobs": False,
        "ai_operator_actions": False,
        "myob_sync": False,
        "enterprise_user_blocks": False,
        "included_users": 10,
        "active_team_members": 10,
    },
    "pro": {
        "name": "Operator",
        "public_name": "Operator",
        "price": 149,
        "max_clients": 40,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "ai_operator_actions": True,
        "myob_sync": False,
        "myob_addon_available": True,
        "enterprise_user_blocks": False,
        "included_users": 25,
        "active_team_members": 25,
    },
    "enterprise": {
        "name": "Command",
        "public_name": "Command",
        "price": 299,
        "max_clients": 50,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "ai_operator_actions": True,
        "payroll_workspace": True,
        "advanced_roles": True,
        "advanced_automation": True,
        "myob_sync": True,
        "enterprise_user_blocks": True,
        "included_users": 50,
        "active_team_members": 50,
        "extra_user_block_size": 50,
        "extra_user_block_price": 99,
        "extra_user_block_label": "Command Growth Pack",
    },
}

def normalize_plan(plan):
    value = str(plan or "").strip().lower()
    if not value or value in ("null", "undefined", "none"):
        return None
    return PLAN_ALIASES.get(value, "solo")

def public_plan_key(plan):
    normalized = normalize_plan(plan)
    reverse = {
        "solo": "start",
        "team": "crew",
        "pro": "operator",
        "enterprise": "command",
    }
    return reverse.get(normalized, "start")

def plan_display_name(plan):
    return PLAN_DISPLAY_NAMES.get(normalize_plan(plan), "Start")

def has_plan_access(current_plan, required_plan):
    current = normalize_plan(current_plan)
    required = normalize_plan(required_plan)
    return PLAN_ORDER.get(current, 0) >= PLAN_ORDER.get(required, 0)

def get_plan_features(plan):
    normalized = normalize_plan(plan)
    features = dict(PLAN_FEATURES.get(normalized, PLAN_FEATURES["solo"]))
    features["legacy_key"] = normalized or "solo"
    features["public_key"] = public_plan_key(normalized)
    return features

def can_use_feature(plan, feature_key):
    return bool(get_plan_features(plan).get(feature_key, False))

def get_max_clients(plan):
    return int(get_plan_features(plan).get("max_clients", 20))
