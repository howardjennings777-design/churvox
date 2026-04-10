export const PLAN_ORDER = {
  solo: 1,
  team: 2,
  pro: 3,
  enterprise: 4,
};

export const normalizePlan = (plan) => {
  const value = String(plan || "").trim().toLowerCase();
  if (value === "team") return "team";
  if (value === "pro") return "pro";
  if (value === "enterprise") return "enterprise";
  return "solo";
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
    maxClients: 35,
    teamManagement: true,
    csvTeamImport: true,
    csvClientImport: true,
    recurringJobs: true,
    myobSync: false,
    enterpriseUserBlocks: false,
    includedUsers: 15,
  },
  enterprise: {
    name: "Enterprise",
    maxClients: 999999,
    teamManagement: true,
    csvTeamImport: true,
    csvClientImport: true,
    recurringJobs: true,
    myobSync: true,
    enterpriseUserBlocks: true,
    includedUsers: 50,
    extraUserBlockSize: 50,
    extraUserBlockPrice: 100,
  },
};

export const getPlanFeatures = (plan) => {
  return PLAN_FEATURES[normalizePlan(plan)] || PLAN_FEATURES.solo;
};

export const canUseFeature = (plan, featureKey) => {
  const features = getPlanFeatures(plan);
  return !!features[featureKey];
};

export const getMaxClients = (plan) => {
  return getPlanFeatures(plan).maxClients;
};
