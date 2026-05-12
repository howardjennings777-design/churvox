import { apiFetch } from "../api";

export const getAiPolicy = () => apiFetch("/ai/operator/policy");
export const getAiDataQuality = () => apiFetch("/ai/operator/data-quality");
export const getAiAudit = () => apiFetch("/ai/operator/audit");
export const updateAiMemory = () => apiFetch("/ai/operator/learn", { method: "POST" });
export const getAiMemory = () => apiFetch("/ai/operator/memory");
export const prepareDailyBriefing = () => apiFetch("/ai/operator/daily-briefing", { method: "POST" });
export const getLatestBriefing = () => apiFetch("/ai/operator/briefing/latest");
export const askBusiness = (question) => apiFetch("/ai/operator/ask", { method: "POST", body: JSON.stringify({ question }) });
export const classifyAiAction = (action_type, payload = {}) => apiFetch("/ai/operator/classify-action", { method: "POST", body: JSON.stringify({ action_type, payload }) });

export async function loadAiIntelligenceSnapshot() {
  const [briefing, quality, audit, memory, policy] = await Promise.all([
    getLatestBriefing().catch(() => ({})),
    getAiDataQuality().catch(() => ({})),
    getAiAudit().catch(() => ({})),
    getAiMemory().catch(() => ({})),
    getAiPolicy().catch(() => ({})),
  ]);
  return {
    briefing: briefing?.briefing || null,
    quality: quality?.quality || null,
    audit: audit?.rows || [],
    memory: memory?.memory?.memory || memory?.memory || null,
    policy: policy?.policy || null,
    dataQualityActions: quality?.actions || [],
  };
}
