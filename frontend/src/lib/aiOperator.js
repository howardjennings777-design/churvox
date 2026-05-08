import { get, post } from "./api";

export const AI_OPERATOR_ENDPOINTS = {
  queue: "/ai/operator/queue",
  runDailyCheck: "/ai/operator/run-daily-check",
  prepareToday: "/ai/operator/prepare-today",
  ask: "/ai/operator/ask",
  approve: (id) => `/ai/operator/actions/${id}/approve`,
  reject: (id) => `/ai/operator/actions/${id}/reject`,
};

export const DEMO_AI_ACTIONS = [
  {
    id: "assign-wilson-plumbing",
    action_type: "assign_worker_to_job",
    module: "dispatch",
    title: "Assign Matt to Wilson Plumbing",
    summary: "Closest available worker, free from 10:30am, plumbing experience, no schedule clash.",
    reason: "This clears an unassigned job today and avoids the owner manually checking worker availability, location and experience.",
    confidence: 92,
    risk_level: "low",
    status: "pending",
    target_record_type: "job",
    target_record_id: "J-1047",
    preview_text: "Assign Matt Wilson to J-1047 and notify the worker.",
    deep_link: "/dispatch?job=J-1047",
    suggested_payload: { worker_name: "Matt Wilson", job_id: "J-1047" },
  },
  {
    id: "draft-davis-invoice",
    action_type: "create_invoice_draft",
    module: "invoices",
    title: "Create Davis Property invoice",
    summary: "Job complete, photos uploaded, time logged, pricing source found.",
    reason: "The job is ready to bill. AI can prefill the invoice description from completion notes, photos and pricing context.",
    confidence: 88,
    risk_level: "medium",
    status: "pending",
    target_record_type: "job",
    target_record_id: "J-1031",
    preview_text: "Create a draft invoice for Davis Property for owner review.",
    deep_link: "/invoices?source_job=J-1031",
    suggested_payload: { customer_name: "Davis Property", source_job_id: "J-1031" },
  },
  {
    id: "quote-followup-high-value",
    action_type: "create_quote_followup",
    module: "quotes",
    title: "Send quote follow-up",
    summary: "4 high-value quotes have no reply after 48 hours. Messages are prepared.",
    reason: "Following up high-value quotes first helps recover pipeline without the owner manually checking every quote.",
    confidence: 84,
    risk_level: "low",
    status: "pending",
    target_record_type: "quote",
    target_record_id: "high-value-followups",
    preview_text: "Hi, just checking whether you had any questions about the quote. Happy to help.",
    deep_link: "/quotes?filter=followup-ready",
    suggested_payload: { followup_type: "high_value_no_response" },
  },
];

const normalizeActions = (payload) => {
  const raw = payload?.data?.actions || payload?.actions || payload?.data || [];
  return Array.isArray(raw) && raw.length ? raw : DEMO_AI_ACTIONS;
};

export async function loadAiOperatorQueue() {
  const result = await get(AI_OPERATOR_ENDPOINTS.queue);
  if (!result.ok) return { ok: false, actions: DEMO_AI_ACTIONS, message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function runAiDailyCheck() {
  const result = await post(AI_OPERATOR_ENDPOINTS.runDailyCheck, {});
  if (!result.ok) return { ok: false, actions: DEMO_AI_ACTIONS, message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function prepareTodayWithAi() {
  const result = await post(AI_OPERATOR_ENDPOINTS.prepareToday, {});
  if (!result.ok) return { ok: false, actions: DEMO_AI_ACTIONS, message: result.message };
  return { ok: true, actions: normalizeActions(result.data), data: result.data };
}

export async function askBusinessAi(question) {
  const result = await post(AI_OPERATOR_ENDPOINTS.ask, { question });
  if (!result.ok) {
    return {
      ok: false,
      answer: "I can prepare an action for that, but the live AI endpoint is not available yet. The request has been kept in the owner approval workflow pattern.",
      message: result.message,
    };
  }
  return {
    ok: true,
    answer: result.data?.answer || result.data?.message || "AI prepared a recommended action.",
    data: result.data,
  };
}

export async function approveAiAction(action) {
  const id = action?.id || action?.action_id;
  if (!id) return { ok: false, message: "Missing AI action id" };
  const result = await post(AI_OPERATOR_ENDPOINTS.approve(id), { action });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || "Approval endpoint not available yet",
      localOnly: true,
    };
  }
  return { ok: true, data: result.data };
}

export async function rejectAiAction(action) {
  const id = action?.id || action?.action_id;
  if (!id) return { ok: false, message: "Missing AI action id" };
  const result = await post(AI_OPERATOR_ENDPOINTS.reject(id), { action });
  if (!result.ok) return { ok: false, message: result.message, localOnly: true };
  return { ok: true, data: result.data };
}
