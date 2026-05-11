const DRAFT_KEY = "churvox_operator_actions";
const APPROVAL_KEY = "churvox_operator_approval_log";
const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (k, items) => localStorage.setItem(k, JSON.stringify(items));

export const readOperatorLocal = () => read(DRAFT_KEY);
export const saveOperatorLocal = (items) => write(DRAFT_KEY, items);

export async function fetchOperatorDrafts(api) {
  try { const res = await api("/operator/drafts"); return { items: res.items || [], source: "backend" }; }
  catch { return { items: read(DRAFT_KEY), source: "local" }; }
}

export async function persistOperatorAction(api, action, status = "pending") {
  const full = { ...action, status, payload: action?.payload && typeof action.payload === 'object' ? action.payload : { ...action }, updated_at: new Date().toISOString() };
  try {
    const res = await api("/operator/drafts", { method: "POST", body: full });
    return { ok: true, source: "backend", item: res, message: "Saved to backend draft queue" };
  } catch (e) {
    const local = read(DRAFT_KEY); local.unshift(full); write(DRAFT_KEY, local);
    return { ok: false, source: "local", error: e.message, item: full, message: "Backend unavailable — saved locally" };
  }
}

export async function fetchOperatorApprovalLog(api) {
  try { const res = await api('/operator/approval-log'); return { items: res.items || [], source: 'backend' }; }
  catch { return { items: read(APPROVAL_KEY), source: 'local' }; }
}

export async function persistOperatorApprovalLog(api, entry) {
  const full = { ...entry, payload: entry?.payload && typeof entry.payload === 'object' ? entry.payload : { ...entry }, updated_at: new Date().toISOString() };
  try {
    const res = await api('/operator/approval-log', { method: 'POST', body: full });
    return { ok: true, source: 'backend', item: res, message: 'Saved to backend draft queue' };
  } catch (e) {
    const local = read(APPROVAL_KEY); local.unshift(full); write(APPROVAL_KEY, local);
    return { ok: false, source: 'local', error: e.message, item: full, message: 'Backend unavailable — saved locally' };
  }
}
