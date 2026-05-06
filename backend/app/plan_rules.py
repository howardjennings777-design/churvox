PLAN_ORDER = {
    "solo": 1,
    "team": 2,
    "pro": 3,
    "enterprise": 4,
}

PLAN_FEATURES = {
    "solo": {
        "name": "Solo",
        "max_clients": 20,
        "team_management": False,
        "csv_team_import": False,
        "csv_client_import": False,
        "recurring_jobs": False,
        "myob_sync": False,
        "enterprise_user_blocks": False,
        "included_users": 1,
    },
    "team": {
        "name": "Team",
        "max_clients": 30,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": False,
        "recurring_jobs": False,
        "myob_sync": False,
        "enterprise_user_blocks": False,
        "included_users": 5,
    },
    "pro": {
        "name": "Pro",
        "max_clients": 40,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "myob_sync": False,
        "enterprise_user_blocks": False,
        "included_users": 15,
    },
    "enterprise": {
        "name": "Enterprise",
        "max_clients": 50,
        "team_management": True,
        "csv_team_import": True,
        "csv_client_import": True,
        "recurring_jobs": True,
        "myob_sync": True,
        "enterprise_user_blocks": True,
        "included_users": 50,
        "extra_user_block_size": 50,
        "extra_user_block_price": 100,
    },
}

def normalize_plan(plan):
    value = str(plan or "").strip().lower()
    if not value or value in ("null", "undefined", "none"):
        return None
    if value in PLAN_ORDER:
        return value
    return "solo"

def has_plan_access(current_plan, required_plan):
    current = normalize_plan(current_plan)
    required = normalize_plan(required_plan)
    return PLAN_ORDER.get(current, 0) >= PLAN_ORDER.get(required, 0)

def get_plan_features(plan):
    normalized = normalize_plan(plan)
    return PLAN_FEATURES.get(normalized, PLAN_FEATURES["solo"])

def can_use_feature(plan, feature_key):
    return bool(get_plan_features(plan).get(feature_key, False))

def get_max_clients(plan):
    return int(get_plan_features(plan).get("max_clients", 20))
