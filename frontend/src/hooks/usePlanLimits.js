import { useAuth } from "../context/AuthContext";
import { getPlanFeatures, normalizePlan, hasPlanAccess } from "../utils/planRules";

export function usePlanLimits(planOverride = null) {
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }

  const safePlan = normalizePlan(planOverride || authUser?.plan || "solo");
  const features = getPlanFeatures(safePlan);

  const isFeatureEnabled = (feature) => {
    const key = String(feature || "").trim().toLowerCase();

    if (key === "team" || key === "teammanagement" || key === "team_management") {
      return !!features.teamManagement;
    }
    if (key === "csvteamimport" || key === "csv_team_import") {
      return !!features.csvTeamImport;
    }
    if (key === "csvclientimport" || key === "csv_client_import") {
      return !!features.csvClientImport;
    }
    if (key === "recurringjobs" || key === "recurring_jobs") {
      return !!features.recurringJobs;
    }
    if (key === "myob" || key === "myobsync" || key === "myob_sync") {
      return !!features.myobSync;
    }
    if (key === "enterpriseuserblocks" || key === "enterprise_user_blocks") {
      return !!features.enterpriseUserBlocks;
    }
    if (key === "sms") {
      return hasPlanAccess(safePlan, "team");
    }

    return !!features[key];
  };

  const canAddWorker = (currentCount = 0) => {
    if (!features.teamManagement) return false;
    return currentCount < (features.includedUsers || 1);
  };

  return {
    plan: safePlan,
    planData: features,
    features,
    maxClients: features.maxClients,
    includedUsers: features.includedUsers,
    canUseTeamManagement: !!features.teamManagement,
    canUseCsvTeamImport: !!features.csvTeamImport,
    canUseCsvClientImport: !!features.csvClientImport,
    canUseRecurringJobs: !!features.recurringJobs,
    canUseMyobSync: !!features.myobSync,
    canUseEnterpriseUserBlocks: !!features.enterpriseUserBlocks,
    isFeatureEnabled,
    canAddWorker,
  };
}

export default usePlanLimits;
