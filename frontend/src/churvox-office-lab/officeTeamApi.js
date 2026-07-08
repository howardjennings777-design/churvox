import API_BASE from "../lib/apiBase";

function host() {
  return String(API_BASE || "").replace(/\/$/, "");
}

function token() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function authHeaders({ json = true } = {}) {
  const t = token();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function trayFor(item = {}) {
  const source = clean(item.tray || item.department || item.record_type || item.kind || item.type).toLowerCase();
  if (source.includes("invoice") || source.includes("quote") || source.includes("payment") || source.includes("money")) return "Money";
  if (source.includes("job") || source.includes("booking") || source.includes("schedule") || source.includes("recurring")) return "Bookings";
  if (source.includes("worker") || source.includes("staff") || source.includes("team") || source.includes("payroll")) return "Staff";
  if (source.includes("client") || source.includes("customer") || source.includes("message")) return "Clients";
  if (source.includes("proof") || source.includes("quality") || source.includes("record")) return "Quality";
  if (source.includes("operation") || source.includes("capacity") || source.includes("profit") || source.includes("stock")) return "Operations";
  return "Command";
}

function priorityFor(item = {}) {
  const raw = clean(item.priority || item.level || item.severity || "medium").toLowerCase();
  if (raw.includes("high") || raw.includes("urgent")) return "Top priority";
  if (raw.includes("low")) return "Low risk";
  if (raw.includes("pattern")) return "Pattern";
  return "Needs check";
}

export function mapBrainActionToDecision(item = {}, index = 0) {
  const title = clean(item.problem || item.title || item.name, "Owner decision needed");
  const summary = clean(item.why || item.summary || item.suggestion || item.detail, "Churvox prepared this for owner review.");
  const prepared = clean(item.prepared || item.prepared_work || item.suggestion || item.next_step, "Prepared for Command review. Nothing has been sent or changed.");
  const ownerOptions = asArray(item.owner_options || item.actions || item.options).map((option) => clean(option)).filter(Boolean);
  return {
    id: clean(item.id || item.action_id || item._id || `brain-${index}`),
    tray: trayFor(item),
    roleName: clean(item.role || item.mimic || item.source, "Admin Brain"),
    level: priorityFor(item),
    title,
    happened: summary,
    checked: asArray(item.checked || item.checks || item.evidence).map((x) => clean(x)).filter(Boolean).slice(0, 5),
    prepared,
    need: clean(item.owner_question || item.needs || item.decision_needed, "Approve, edit, park, or ask for more information?"),
    actions: ownerOptions.length ? ownerOptions.slice(0, 5) : ["Approve", "Edit", "Park", "Ask staff"],
    raw: item,
  };
}

function countsFromDecisions(decisions = []) {
  const byTray = decisions.reduce((acc, item) => {
    acc[item.tray] = (acc[item.tray] || 0) + 1;
    return acc;
  }, {});
  return {
    total: decisions.length,
    high: decisions.filter((item) => item.level === "Top priority").length,
    byTray,
  };
}

export async function fetchOfficeTeamSnapshot() {
  const base = host();
  if (!base) return { source: "demo", decisions: [] };
  const response = await fetch(`${base}/api/admin-brain/scan`, {
    credentials: "include",
    headers: authHeaders({ json: false }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) return { source: "demo", decisions: [] };
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Admin Brain failed ${response.status}`);
  const rawActions = asArray(body?.actions).length ? body.actions : asArray(body?.items);
  const decisions = rawActions.map(mapBrainActionToDecision);
  const counts = body?.counts || countsFromDecisions(decisions);
  return {
    source: decisions.length ? "admin-brain" : "clear-live",
    decisions,
    counts,
    fetchedAt: new Date().toISOString(),
  };
}

export async function recordOfficeTeamDecision(decision, action) {
  const base = host();
  const actionId = clean(decision?.id || decision?.raw?.id || decision?.raw?.action_id);
  if (!base || !actionId || actionId.startsWith("demo-") || actionId.startsWith("brain-")) {
    return { success: true, localOnly: true, message: "Saved locally in lab preview." };
  }
  const response = await fetch(`${base}/api/admin-brain/decide`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({
      action_id: actionId,
      decision: action,
      source: "office_team_lab",
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Decision failed ${response.status}`);
  return body;
}

export function makeStatusCards(counts = {}, fallbackTotal = 35) {
  const total = Number(counts.total ?? fallbackTotal) || 0;
  const high = Number(counts.high ?? 6) || 0;
  return [
    { value: String(total), label: "Prepared", note: total ? "Ready for review" : "Office watching" },
    { value: String(high), label: "Needs owner", note: "Ranked by risk" },
    { value: "0", label: "Auto-sent", note: "Approval locked" },
    { value: String(counts.parked ?? 4), label: "Parked", note: "Waiting on info" },
  ];
}
