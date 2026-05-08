import { get, post } from "./api";

export const AI_OPERATOR_ENDPOINTS = {
  queue: "/ai/operator/queue",
  runDailyCheck: "/ai/operator/run-daily-check",
  prepareToday: "/ai/operator/prepare-today",
  ask: "/ai/operator/ask",
  approve: (id) => `/ai/operator/actions/${id}/approve`,
  reject: (id) => `/ai/operator/actions/${id}/reject`,
};

const normalizeActions = (payload) => {
  const raw = payload?.data?.actions || payload?.actions || payload?.data || [];
  return Array.isArray(raw) ? raw : [];
};

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
      answer: "The live AI Operator endpoint is not available yet. No fake response was created.",
      message: result.message,
    };
  }
  return {
    ok: true,
    answer: result.data?.answer || result.data?.message || "AI prepared a recommendation.",
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
