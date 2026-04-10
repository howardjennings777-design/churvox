import { getPlanFeatures, normalizePlan } from "../utils/planRules";

export function usePlanLimits(plan) {
  const safePlan = normalizePlan(plan);
  const features = getPlanFeatures(safePlan);

  return {
    plan: safePlan,
    maxClients: features.maxClients,
    includedUsers: features.includedUsers,
    canUseTeamManagement: !!features.teamManagement,
    canUseCsvTeamImport: !!features.csvTeamImport,
    canUseCsvClientImport: !!features.csvClientImport,
    canUseRecurringJobs: !!features.recurringJobs,
    canUseMyobSync: !!features.myobSync,
    canUseEnterpriseUserBlocks: !!features.enterpriseUserBlocks,
    features,
  };
}

export default usePlanLimits;
