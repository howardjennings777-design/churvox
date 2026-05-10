import { get, post } from "./api";

export const AI_OPERATOR_ENDPOINTS = {
  status: "/ai/operator/v3/strong/status",
  queue: "/ai/operator/v3/strong/queue",
  runDailyCheck: "/ai/operator/v3/strong/run-daily-check",
  prepareToday: "/ai/operator/v3/strong/prepare-today",
  ask: "/ai/operator/v3/strong/ask",
  approve: (id) => `/ai/operator/v3/strong/actions/${id}/approve`,
  reject: (id) => `/ai/operator/v3/strong/actions/${id}/reject`,
};

const normalizeActions = (payload) => {
  const raw = payload?.data?.actions || payload?.actions || payload?.data || [];
  return Array.isArray(raw) ? raw : [];
};

export async function loadStrongAiStatus() {
  const result = await get(AI_OPERATOR_ENDPOINTS.status);
  if (!result.ok) return { ok: false, configured: false, message: result.message };
  return { ok: true, configured: !!result.data?.configured, data: result.data };
}

export async function loadAiOperatorQueue() {
  const result = await get(AI_OPERATOR_ENDPOINTS.queue);
  if (!result.ok) return { ok: false, actions: [], message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function runAiDailyCheck() {
  const result = await post(AI_OPERATOR_ENDPOINTS.runDailyCheck, {});
  if (!result.ok) return { ok: false, actions: [], message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function prepareTodayWithAi() {
  const result = await post(AI_OPERATOR_ENDPOINTS.prepareToday, {});
  if (!result.ok) return { ok: false, actions: [], message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function askBusinessAi(question) {
  const result = await post(AI_OPERATOR_ENDPOINTS.ask, { question });
  if (!result.ok) {
    return {
      ok: false,
      answer: "AI Operator is not configured yet.",
      message: result.message,
    };
  }
  return {
    ok: true,
    answer: result.data?.answer || result.data?.message || "AI prepared a recommendation.",
    recommended_next_steps: result.data?.recommended_next_steps || [],
    actions: result.data?.actions || [],
    data: result.data,
  };
}

export async function approveAiAction(action) {
  const id = action?.id || action?.action_id;
  if (!id) return { ok: false, message: "Missing AI action id" };
  const result = await post(AI_OPERATOR_ENDPOINTS.approve(id), { action });
  if (!result.ok) return { ok: false, message: result.message || "Approval endpoint failed" };
  return { ok: true, data: result.data };
}

export async function rejectAiAction(action) {
  const id = action?.id || action?.action_id;
  if (!id) return { ok: false, message: "Missing AI action id" };
  const result = await post(AI_OPERATOR_ENDPOINTS.reject(id), { action });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, data: result.data };
}

export async function loadAiOperatorPageQueue() {
  return loadAiOperatorQueue();
}

export async function preparePageWithAi(page) {
  const clean = String(page || "decisions").toLowerCase();
  const result = await post(`/ai/operator/v3/strong/pages/${clean}/prepare`, {});
  if (!result.ok) return { ok: false, actions: [], message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}
