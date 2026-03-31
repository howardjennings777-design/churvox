import { useState, useEffect, useCallback } from "react";
import { useApi } from "./useApi";

export function usePlanLimits() {
  const { get } = useApi();
  const [planData, setPlanData] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    const res = await get("/plan/limits");
    if (res.success) setPlanData(res.data);
    setPlanLoading(false);
  }, [get]);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const isFeatureEnabled = useCallback((feature) => {
    if (!planData) return true; // Allow while loading
    return !!planData.limits?.[feature];
  }, [planData]);

  const canAddWorker = useCallback(() => {
    if (!planData) return true;
    if (!planData.limits?.team) return false;
    return planData.max_workers < 0 || planData.usage.workers < planData.max_workers;
  }, [planData]);

  const canAddClient = useCallback(() => {
    if (!planData) return true;
    const max = planData.limits?.max_clients;
    return max < 0 || planData.usage.clients < max;
  }, [planData]);

  return { planData, planLoading, isFeatureEnabled, canAddWorker, canAddClient, refetch: fetchLimits };
}
