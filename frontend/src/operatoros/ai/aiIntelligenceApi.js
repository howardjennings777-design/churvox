import { apiFetch } from "../api";

export function getAiPolicy() {
  return apiFetch("/ai/operator/policy");
}

export function getAiDataQuality() {
  return apiFetch("/ai/operator/data-quality");
}

export function getAiAudit() {
  return apiFetch("/ai/operator/audit");
}

export function updateAiMemory() {
  return apiFetch("/ai/operator/learn", {
    method: "POST",
  });
}

export function getAiMemory() {
  return apiFetch("/ai/operator/memory");
}

export function prepareDailyBriefing() {
  return apiFetch("/ai/operator/daily-briefing", {
    method: "POST",
  });
}

export function getLatestBriefing() {
  return apiFetch("/ai/operator/briefing/latest");
}

export function askBusiness(question) {
  return apiFetch("/ai/operator/ask", {
    method: "POST",
    body: { question },
  });
}

export function classifyAiAction(action_type, payload = {}) {
  return apiFetch("/ai/operator/classify-action", {
    method: "POST",
    body: {
      ...payload,
      action_type,
    },
  });
}

function unwrap(result, key, fallback) {
  if (!result || typeof result !== "object") return fallback;
  return result[key] ?? result.report ?? result.rows ?? fallback;
}

export async function loadAiIntelligenceSnapshot() {
  const [briefingRes, qualityRes, auditRes, memoryRes, policyRes] = await Promise.all([
    getLatestBriefing().catch(() => null),
    getAiDataQuality().catch(() => null),
    getAiAudit().catch(() => null),
    getAiMemory().catch(() => null),
    getAiPolicy().catch(() => null),
  ]);

  const quality = qualityRes?.quality || qualityRes?.report || null;
  const audit = Array.isArray(auditRes?.audit)
    ? auditRes.audit
    : Array.isArray(auditRes?.rows)
      ? auditRes.rows
      : [];

  return {
    briefing: briefingRes?.briefing || null,
    quality,
    dataQualityActions: qualityRes?.dataQualityActions || qualityRes?.actions || [],
    audit,
    memory: memoryRes?.memory || null,
    policy: policyRes?.policy || null,
    raw: {
      briefing: unwrap(briefingRes, "briefing", null),
      quality: unwrap(qualityRes, "quality", null),
      audit: unwrap(auditRes, "audit", []),
      memory: unwrap(memoryRes, "memory", null),
      policy: unwrap(policyRes, "policy", null),
    },
  };
}
