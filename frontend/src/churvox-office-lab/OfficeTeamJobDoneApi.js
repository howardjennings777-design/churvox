import API_BASE from "../lib/apiBase";
import { BACKEND_COMMAND_EVENT } from "./OfficeTeamCommandApi";

export const JOB_DONE_REALITY_BUILD = "churvox-job-done-reality-v1-20260714";
if (typeof window !== "undefined") window.__CHURVOX_JOB_DONE_REALITY_BUILD__ = JOB_DONE_REALITY_BUILD;

function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  return configured || (typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "");
}

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function headers({ json = false } = {}) {
  const auth = token();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${host()}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { ...headers({ json: Boolean(options.body) }), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) return { locked: true, success: false, closeouts: [], metrics: [], items: [], message: body?.detail || "Sign in as an owner." };
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Job Done request failed ${response.status}`);
  return body;
}

export async function fetchJobDoneCloseouts() {
  const body = await request("/api/job-done/closeouts?limit=120");
  return {
    source: body.locked ? "locked" : "persisted",
    closeouts: Array.isArray(body.closeouts) ? body.closeouts : [],
    message: body.message || body.safety || "Persisted Job Done closeouts loaded.",
  };
}

export async function scanJobDoneCloseouts() {
  const body = await request("/api/job-done/scan", { method: "POST", body: JSON.stringify({ source: "owner_workspace" }) });
  return {
    source: body.locked ? "locked" : "persisted",
    closeouts: Array.isArray(body.closeouts) ? body.closeouts : [],
    count: Number(body.count || 0),
    message: body.message || body.safety || "Job Done scan complete.",
  };
}

export async function fetchMoneyRadar() {
  const body = await request("/api/job-done/money-radar");
  return {
    source: body.locked ? "locked" : "persisted",
    metrics: Array.isArray(body.metrics) ? body.metrics : [],
    items: Array.isArray(body.items) ? body.items : [],
    message: body.message || body.safety || "Persisted Money Radar loaded.",
  };
}

export async function prepareJobDoneCloseout(closeoutId, intent = "full_closeout") {
  if (!closeoutId) throw new Error("A persisted Job Done closeout is required.");
  const body = await request(`/api/job-done/closeouts/${encodeURIComponent(closeoutId)}/prepare`, {
    method: "POST",
    body: JSON.stringify({ intent, prepared_only: true, owner_review_only: true }),
  });
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}

export async function prepareMoneyRadarItem(item = {}) {
  if (!item.closeout_id) throw new Error("This money item is not linked to a persisted closeout yet.");
  const body = await request("/api/job-done/money-radar/prepare", {
    method: "POST",
    body: JSON.stringify({ closeout_id: item.closeout_id, intent: item.next || "money_review", prepared_only: true, owner_review_only: true }),
  });
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}
