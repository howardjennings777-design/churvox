const KEY = "churvox_operator_actions";
export function readOperatorLocal() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
export function saveOperatorLocal(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
export async function fetchOperatorDrafts(api) { try { const res = await api("/operator/drafts"); return { items: res.items || [], source: "backend" }; } catch { return { items: readOperatorLocal(), source: "local" }; } }
export async function persistOperatorAction(api, action) { try { const payload = { ...action, type: action.type, status: action.status, payload: action.payload || action };
    const res = await api("/operator/drafts", { method: "POST", body: payload });
    return { ok: true, source: "backend", item: res };
  } catch (e) {
    const local = readOperatorLocal(); local.unshift(action); saveOperatorLocal(local);
    return { ok: false, source: "local", error: e.message };
  }
}
