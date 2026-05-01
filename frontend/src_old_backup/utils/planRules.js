export const PLAN_ORDER = {
  solo: 1,
  team: 2,
  pro: 3,
  enterprise: 4,
};

export const EXTRA_USER_BLOCK_SIZE = 50;
export const EXTRA_USER_BLOCK_PRICE = 100;

export const normalizePlan = (plan) => {
  const value = String(plan || "").trim().toLowerCase();
  if (value === "solo") return "solo";
  if (value === "team") return "team";
  if (value === "pro") return "pro";
  if (value === "enterprise") return "enterprise";
  if (!value || value === "null" || value === "undefined" || value === "none") return "none";
  return "solo";
};

export const getExtraUserBlocks = (userOrBilling = {}) => {
  const raw = userOrBilling?.extra_user_blocks ?? userOrBilling?.user_blocks ?? userOrBilling?.capacity_blocks ?? userOrBilling?.additional_user_blocks ?? 0;
  const blocks = Number(raw || 0);
  return Number.isFinite(blocks) && blocks > 0 ? Math.floor(blocks) : 0;
};

export const hasPlanAccess = (currentPlan, requiredPlan) => {
  const current = normalizePlan(currentPlan);
  const required = normalizePlan(requiredPlan);
  return (PLAN_ORDER[current] || 0) >= (PLAN_ORDER[required] || 0);
};

export const PLAN_FEATURES = {
  solo: {
    name: "Solo",
    maxClients: 20,
    teamManagement: false,
    csvTeamImport: false,
    csvClientImport: false,
    recurringJobs: false,
    myobSync: false,
    enterpriseUserBlocks: false,
    includedUsers: 1,
  },
  team: {
    name: "Team",
    maxClients: 30,
    teamManagement: true,
    csvTeamImport: true,
    csvClientImport: false,
    recurringJobs: false,
    myobSync: false,
    enterpriseUserBlocks: false,
    includedUsers: 5,
  },
  pro: {
    name: "Pro",
    maxClients: 40,
    teamManagement: true,
    csvTeamImport: true,
    csvClientImport: true,
    recurringJobs: true,
    myobSync: false,
    enterpriseUserBlocks: false,
    includedUsers: 20,
  },
  enterprise: {
    name: "Enterprise",
    maxClients: 50,
    teamManagement: true,
    csvTeamImport: true,
    csvClientImport: true,
    recurringJobs: true,
    myobSync: true,
    enterpriseUserBlocks: true,
    includedUsers: 50,
    extraUserBlockSize: EXTRA_USER_BLOCK_SIZE,
    extraUserBlockPrice: EXTRA_USER_BLOCK_PRICE,
  },
};

export const getPlanFeatures = (plan, userOrBilling = null) => {
  const base = PLAN_FEATURES[normalizePlan(plan)] || PLAN_FEATURES.solo;
  const extraBlocks = getExtraUserBlocks(userOrBilling || {});
  const extraUsers = base.enterpriseUserBlocks ? extraBlocks * EXTRA_USER_BLOCK_SIZE : 0;
  return {
    ...base,
    extraUserBlocks: extraBlocks,
    extraUsers,
    includedUsersBase: base.includedUsers,
    includedUsers: Number(base.includedUsers || 1) + extraUsers,
    extraUserBlockSize: base.extraUserBlockSize || EXTRA_USER_BLOCK_SIZE,
    extraUserBlockPrice: base.extraUserBlockPrice || EXTRA_USER_BLOCK_PRICE,
  };
};

export const canUseFeature = (plan, featureKey) => {
  const features = getPlanFeatures(plan);
  return !!features[featureKey];
};

export const getMaxClients = (plan) => {
  return getPlanFeatures(plan).maxClients;
};
