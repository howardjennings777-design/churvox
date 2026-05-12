import { apiFetch } from "../api";

export const getAiPolicy = () => apiFetch("/ai/operator/policy");
export const getAiDataQuality = () => apiFetch("/ai/operator/data-quality");
export const getAiAudit = () => apiFetch("/ai/operator/audit");
export const updateAiMemory = () => apiFetch("/ai/operator/learn", { method: "POST" });
export const getAiMemory = () => apiFetch("/ai/operator/memory");
export const prepareDailyBriefing = () => apiFetch("/ai/operator/daily-briefing", { method: "POST" });
export const getLatestBriefing = () => apiFetch("/ai/operator/briefing/latest");
export const askBusiness = (question) => apiFetch("/ai/operator/ask", { method: "POST", body: JSON.stringify({ question }) });
export const classifyAiAction = (action_type, action = null) => apiFetch("/ai/operator/classify-action", { method: "POST", body: JSON.stringify({ action_type, action }) });

export async function loadAiIntelligenceSnapshot() {
  const [policy, quality, memory, briefing, audit] = await Promise.allSettled([
    getAiPolicy(), getAiDataQuality(), getAiMemory(), getLatestBriefing(), getAiAudit(),
  ]);
  const value = (x, d) => (x.status === "fulfilled" ? x.value : d);
  return { policy: value(policy, {}), quality: value(quality, {}), memory: value(memory, {}), briefing: value(briefing, {}), audit: value(audit, {}) };
}
