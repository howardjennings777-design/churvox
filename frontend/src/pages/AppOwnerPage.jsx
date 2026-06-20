import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Download,
  DollarSign,
  Eye,
  Globe2,
  LifeBuoy,
  LogOut,
  Mail,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import RemoveCustomerDataCard from "./admin/RemoveCustomerDataCard";

const TABS = [
  ["overview", "Overview", Globe2],
  ["signups", "Signups", Users],
  ["users", "All users", Users],
  ["businesses", "Businesses", Building2],
  ["billing", "Billing", CreditCard],
  ["activity", "Activity", Activity],
  ["support", "Support", LifeBuoy],
  ["settings", "Settings", Settings],
];

const PLAN_LABELS = {
  solo: "Start",
  start: "Start",
  team: "Crew",
  crew: "Crew",
  pro: "Operator",
  operator: "Operator",
  enterprise: "Command",
  command: "Command",
  trial: "Trial",
  none: "No plan",
  "choose plan": "No plan",
  "no plan": "No plan",
  unknown: "No plan",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function token() {
  try {
    return window.localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function apiHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
  };
}

async function ownerGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: apiHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false || body?.success === false) {
    throw new Error(body?.detail || body?.message || body?.error || `Request failed: ${res.status}`);
  }
  return body;
}

async function ownerPost(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: apiHeaders(),
    body: JSON.stringify(payload || {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false || body?.success === false) {
    throw new Error(body?.detail || body?.message || body?.error || `Request failed: ${res.status}`);
  }
  return body;
}

function logoutHQ() {
  try {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("owner_portal_session");
    window.localStorage.removeItem("platform_owner_email");
    window.localStorage.removeItem("churvox_plan_choice_required");
  } catch {}
  window.location.href = "/login";
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

function dateText(value) {
  if (!value) return "Not set";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-NZ");
  } catch {
    return String(value);
  }
}

function dateOnly(value) {
  if (!value) return "Not set";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-NZ");
  } catch {
    return String(value);
  }
}

function ageText(value) {
  if (!value) return "No date";
  try {
    const then = new Date(value).getTime();
    if (!then) return "No date";
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "No date";
  }
}

function short(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function keyOf(item) {
  return String(item?.id || item?._id || item?.user_id || item?.email || item?.business_id || item?.path || Math.random()).trim();
}

function userIdentifier(item) {
  return String(item?.id || item?._id || item?.user_id || item?.email || "").trim();
}

function canRemoveUser(item) {
  const email = lower(item?.email);
  if (!userIdentifier(item)) return false;
  if (email === "hello@churvox.com") return false;
  if (item?.hq_can_remove === false) return false;
  if (item?.is_platform_owner || item?.is_admin) return false;
  return true;
}

function recordName(item) {
  return (
    item?.business_name ||
    item?.company ||
    item?.trading_name ||
    item?.name ||
    item?.full_name ||
    item?.customer_name ||
    item?.client_name ||
    item?.email ||
    item?.path ||
    "Record"
  );
}

function planLabel(item) {
  const raw = lower(item?.plan_name || item?.plan || item?.subscription_plan || item?.plan_type || item?.tier || "unknown");
  return PLAN_LABELS[raw] || short(item?.plan_name || raw.charAt(0).toUpperCase() + raw.slice(1), "No plan");
}

function billingStatus(item) {
  return short(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown");
}

function lastActivity(item) {
  return item?.last_active || item?.last_seen || item?.last_login || item?.updated_at || item?.created_at;
}

function createdAt(item) {
  return item?.created_at || item?.createdAt || item?.signup_at || item?.registered_at || item?.joined_at;
}

function businessKey(item) {
  return String(item?.business_id || item?.owner_id || item?.user_id || item?.id || item?._id || "").trim();
}

function countForBusiness(list, businessId) {
  if (!businessId) return 0;
  return asArray(list).filter((item) => String(item?.business_id || item?.owner_id || item?.user_id || "") === String(businessId)).length;
}

function toneClass(value) {
  const v = lower(value);
  if (v.includes("active") || v.includes("paid") || v.includes("healthy") || v.includes("ready")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (v.includes("trial") || v.includes("tester") || v.includes("help") || v.includes("setup") || v.includes("new")) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
  if (v.includes("fail") || v.includes("past") || v.includes("unpaid") || v.includes("cancel") || v.includes("required") || v.includes("issue")) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function isPaidUser(item) {
  const status = lower(billingStatus(item));
  const plan = lower(planLabel(item));
  return status.includes("paid") || status.includes("active") || ["start", "crew", "operator", "command"].includes(plan);
}

function isTrialUser(item) {
  return lower(billingStatus(item)).includes("trial") || lower(planLabel(item)).includes("trial") || Boolean(item?.trial_ends_at);
}

function isNoPlan(item) {
  return ["", "unknown", "no plan", "choose plan", "none"].includes(lower(planLabel(item)));
}

function hasPaymentIssue(item) {
  return /fail|past|unpaid|cancel|required|payment|billing/i.test(String(billingStatus(item)));
}

function isNewToday(item) {
  const created = createdAt(item);
  if (!created) return false;
  const d = new Date(created);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function healthForBusiness(item, lists) {
  const id = businessKey(item);
  const jobs = countForBusiness(lists.jobs, id);
  const clients = countForBusiness(lists.clients, id);
  const invoices = countForBusiness(lists.invoices, id);
  const usage = jobs + clients + invoices;
  const status = lower(billingStatus(item));
  if (status.includes("fail") || status.includes("past") || status.includes("unpaid") || status.includes("required")) return "Payment issue";
  if (usage === 0) return "Needs setup help";
  if (jobs === 0) return "No jobs yet";
  if (invoices === 0) return "No invoices yet";
  return "Healthy";
}

function dedupeByKey(rows) {
  const seen = new Set();
  const out = [];
  asArray(rows).forEach((item) => {
    const key = lower(item?.email || item?.id || item?._id || item?.user_id || JSON.stringify(item));
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function downloadCsv(filename, rows) {
  const safeRows = asArray(rows);
  const keys = Array.from(new Set(safeRows.flatMap((row) => Object.keys(row || {})))).slice(0, 60);
  const csv = [
    keys.join(","),
    ...safeRows.map((row) =>
      keys
        .map((key) => {
          const value = row?.[key];
          const text = value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, helper, icon: Icon, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    red: "border-red-500/20 bg-red-500/10 text-red-200",
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-200",
  };
  return (
    <article className="rounded-[26px] border border-slate-800 bg-slate-950/75 p-5 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
        {Icon ? <span className={`rounded-2xl border p-2 ${tones[tone] || tones.cyan}`}><Icon size={18} /></span> : null}
      </div>
      <strong className="block text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">{value}</strong>
      {helper ? <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{helper}</p> : null}
    </article>
  );
}

function Pill({ children, tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass(tone || children)}`}>{children}</span>;
}

function Line({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-800 py-2 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-slate-100">{String(value)}</span>
    </div>
  );
}

function Empty({ children = "No records returned yet." }) {
  return (
    <div className="rounded-[26px] border border-slate-800 bg-slate-950/70 p-10 text-center text-sm font-bold text-slate-400">
      <CheckCircle className="mx-auto mb-3 text-emerald-300" />
      {children}
    </div>
  );
}

function UserTable({ rows, onOpen, selectedIds, onToggle }) {
  const safeRows = asArray(rows);
  if (!safeRows.length) return <Empty>No users returned yet.</Empty>;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/90 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {onToggle ? <th className="px-4 py-3">Pick</th> : null}
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Billing</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Open</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((item) => {
              const key = keyOf(item);
              const removable = canRemoveUser(item);
              return (
                <tr key={key} className="border-t border-slate-800 hover:bg-slate-900/60">
                  {onToggle ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!removable}
                        checked={selectedIds?.has(key)}
                        onChange={() => onToggle(item)}
                        className="h-4 w-4 accent-orange-500"
                      />
                    </td>
                  ) : null}
                  <td className="max-w-[260px] px-4 py-3">
                    <button type="button" onClick={() => onOpen(item)} className="block max-w-full text-left">
                      <b className="block truncate text-white">{recordName(item)}</b>
                      <span className="block truncate text-xs font-bold text-slate-500">{short(item.email || item.phone || item.mobile)}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3"><Pill tone={planLabel(item)}>{planLabel(item)}</Pill></td>
                  <td className="px-4 py-3"><Pill tone={billingStatus(item)}>{billingStatus(item)}</Pill></td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-300">{short(item.business_name || item.company || item.business_id)}</td>
                  <td className="px-4 py-3 text-slate-400">{dateOnly(createdAt(item))}</td>
                  <td className="px-4 py-3 text-slate-400">{ageText(lastActivity(item))}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-100 hover:border-orange-400">
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BusinessGrid({ rows, lists, onOpen }) {
  const safeRows = asArray(rows);
  if (!safeRows.length) return <Empty>No businesses returned yet.</Empty>;

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {safeRows.map((item) => {
        const id = businessKey(item);
        const health = healthForBusiness(item, lists);
        return (
          <article key={keyOf(item)} className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-white">{recordName(item)}</h3>
                <p className="truncate text-xs font-semibold text-slate-500">Owner: {short(item.email)}</p>
              </div>
              <Pill tone={health}>{health}</Pill>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Pill tone={planLabel(item)}>{planLabel(item)}</Pill>
              <Pill tone={billingStatus(item)}>{billingStatus(item)}</Pill>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.jobs, id)}</b><small className="block text-slate-500">Jobs</small></div>
              <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.invoices, id)}</b><small className="block text-slate-500">Invoices</small></div>
              <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.clients, id)}</b><small className="block text-slate-500">Clients</small></div>
            </div>
            <Line label="Business ID" value={id} />
            <Line label="Created" value={dateText(createdAt(item))} />
            <Line label="Last active" value={dateText(lastActivity(item))} />
            <button type="button" onClick={() => onOpen(item)} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white hover:border-orange-400">
              Open details
            </button>
          </article>
        );
      })}
    </section>
  );
}

function ActivityGrid({ rows }) {
  const safeRows = asArray(rows);
  if (!safeRows.length) return <Empty>No activity returned yet.</Empty>;

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {safeRows.map((item, idx) => (
        <article key={`${keyOf(item)}-${idx}`} className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-200"><Activity size={15} /></span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">{short(item.title || item.label || item.kind || item.path, "Activity")}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">{short(item.meta || item.user_email || item.email || item.ip || item.referrer)}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{dateText(item.at || item.last_seen || item.created_at)}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function DetailModal({ item, onClose, onDelete }) {
  const [copied, setCopied] = React.useState("");
  if (!item) return null;

  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {}
  }

  const email = item.email || item.owner_email || item.user_email;
  const removable = canRemoveUser(item);

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/75 p-4">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200">HQ record</div>
            <h2 className="text-3xl font-black tracking-[-0.06em]">{recordName(item)}</h2>
            <p className="mt-2 text-sm font-bold text-slate-400">{short(email || item.phone || item.business_id)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-300"><X size={18} /></button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Pill tone={planLabel(item)}>{planLabel(item)}</Pill>
          <Pill tone={billingStatus(item)}>{billingStatus(item)}</Pill>
          {item.hq_record_type ? <Pill tone={item.hq_record_type}>{item.hq_record_type}</Pill> : null}
          {copied ? <Pill tone="Healthy">{copied} copied</Pill> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="mb-3 text-lg font-black">Account</h3>
            <Line label="Email" value={email} />
            <Line label="User ID" value={item.id || item._id || item.user_id} />
            <Line label="Role" value={item.role} />
            <Line label="Created" value={dateText(createdAt(item))} />
            <Line label="Last active" value={dateText(lastActivity(item))} />
          </section>
          <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="mb-3 text-lg font-black">Business / billing</h3>
            <Line label="Business" value={item.business_name || item.company || item.business_id} />
            <Line label="Plan" value={planLabel(item)} />
            <Line label="Billing" value={billingStatus(item)} />
            <Line label="Trial ends" value={dateText(item.trial_ends_at)} />
            <Line label="Tester until" value={dateText(item.free_tester_until)} />
          </section>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {email ? <a href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white no-underline hover:border-orange-400"><Mail size={16} /> Email user</a> : null}
          {email ? <button type="button" onClick={() => copy(email, "Email")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white hover:border-orange-400"><Copy size={16} /> Copy email</button> : null}
          <button type="button" onClick={() => copy(item.id || item._id || item.user_id || item.business_id || "", "ID")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white hover:border-orange-400"><Copy size={16} /> Copy ID</button>
          <button type="button" disabled={!removable} onClick={() => removable && onDelete?.(item)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${removable ? "border border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25" : "border border-slate-700 bg-slate-900 text-slate-500"}`}><Trash2 size={16} /> {removable ? "Delete account" : "Protected account"}</button>
        </div>

        <details className="mt-4 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
          <summary className="cursor-pointer text-sm font-black text-slate-200">Raw record</summary>
          <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl bg-black/40 p-3 text-xs text-slate-300">{JSON.stringify(item, null, 2)}</pre>
        </details>
      </section>
    </div>
  );
}

function DeleteAccountModal({ target, onClose, onDeleted }) {
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!target) return null;

  const identifier = userIdentifier(target);
  const expected = "DELETE";

  async function runDelete() {
    setBusy(true);
    setError("");
    try {
      await ownerPost("/api/admin/owner/delete-user", { identifier, confirm });
      onDeleted?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not delete this account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/80 p-4">
      <section className="w-full max-w-xl rounded-[30px] border border-red-500/30 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-200">Delete account</div>
            <h2 className="text-3xl font-black tracking-[-0.06em]">Remove {recordName(target)}?</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-400">This uses the backend owner delete endpoint. Protected owner accounts cannot be removed.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-300"><X size={18} /></button>
        </div>

        <Line label="Identifier" value={identifier} />
        <Line label="Email" value={target.email} />
        <Line label="Plan" value={planLabel(target)} />

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-black text-slate-300">Type DELETE to confirm</span>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-red-400" />
        </label>

        {error ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white">Cancel</button>
          <button type="button" disabled={busy || confirm !== expected} onClick={runDelete} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{busy ? "Deleting..." : "Delete account"}</button>
        </div>
      </section>
    </div>
  );
}

export default function AppOwnerPage() {
  const [data, setData] = React.useState(null);
  const [planReport, setPlanReport] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [selected, setSelected] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());

  const load = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const [overviewResult, plansResult] = await Promise.allSettled([
        ownerGet("/api/admin/owner-overview"),
        ownerGet("/api/admin/owner/plan-report"),
      ]);
      if (overviewResult.status === "rejected") throw overviewResult.reason;
      setData(overviewResult.value || {});
      if (plansResult.status === "fulfilled") setPlanReport(plansResult.value || {});
    } catch (err) {
      setError(err?.message || "Could not load Churvox HQ data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const lists = React.useMemo(() => data?.lists || {}, [data]);
  const metrics = data?.metrics || {};

  const allUsers = React.useMemo(() => dedupeByKey([
    ...asArray(lists.all_users),
    ...asArray(lists.users),
    ...asArray(planReport?.users),
    ...asArray(planReport?.customers),
  ]), [lists, planReport]);

  const businesses = React.useMemo(() => asArray(lists.businesses), [lists]);
  const paidUsers = React.useMemo(() => allUsers.filter(isPaidUser), [allUsers]);
  const trialUsers = React.useMemo(() => allUsers.filter(isTrialUser), [allUsers]);
  const noPlanUsers = React.useMemo(() => allUsers.filter(isNoPlan), [allUsers]);
  const newToday = React.useMemo(() => allUsers.filter(isNewToday), [allUsers]);
  const paymentIssues = React.useMemo(() => allUsers.filter(hasPaymentIssue), [allUsers]);
  const activeNow = React.useMemo(() => asArray(lists.active_now), [lists]);
  const activeToday = React.useMemo(() => asArray(lists.active_today), [lists]);
  const events = React.useMemo(() => [...asArray(lists.events), ...asArray(lists.activity), ...activeToday].slice(0, 80), [lists, activeToday]);
  const supportQueue = React.useMemo(() => businesses.filter((item) => healthForBusiness(item, lists) !== "Healthy"), [businesses, lists]);

  const signups = React.useMemo(() => {
    return [...allUsers].sort((a, b) => new Date(createdAt(b) || 0).getTime() - new Date(createdAt(a) || 0).getTime());
  }, [allUsers]);

  const planOptions = React.useMemo(() => ["All", ...Array.from(new Set(allUsers.map(planLabel))).filter(Boolean)], [allUsers]);
  const statusOptions = React.useMemo(() => ["All", ...Array.from(new Set(allUsers.map(billingStatus))).filter(Boolean)], [allUsers]);

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allUsers.filter((item) => {
      const matchesQuery = !q || JSON.stringify(item).toLowerCase().includes(q);
      const matchesPlan = planFilter === "All" || planLabel(item) === planFilter;
      const matchesStatus = statusFilter === "All" || billingStatus(item) === statusFilter;
      return matchesQuery && matchesPlan && matchesStatus;
    });
  }, [allUsers, query, planFilter, statusFilter]);

  const filteredSignups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return signups.filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q));
  }, [signups, query]);

  const selectedUsers = React.useMemo(() => allUsers.filter((user) => selectedIds.has(keyOf(user))), [allUsers, selectedIds]);

  function openTab(key) {
    setActiveTab(key);
    setQuery("");
    setSelectedIds(new Set());
    try {
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch {}
  }

  function toggleSelect(user) {
    if (!canRemoveUser(user)) return;
    const key = keyOf(user);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredUsers.filter(canRemoveUser).forEach((user) => next.add(keyOf(user)));
      return next;
    });
  }

  async function deleteSelected() {
    if (!selectedUsers.length) return;
    const ok = window.confirm(`Delete ${selectedUsers.length} selected account(s)? Type DELETE in each modal is safer, but this will call the owner delete endpoint for selected removable users.`);
    if (!ok) return;
    for (const user of selectedUsers.filter(canRemoveUser)) {
      await ownerPost("/api/admin/owner/delete-user", { identifier: userIdentifier(user), confirm: "DELETE" });
    }
    setSelectedIds(new Set());
    await load(true);
  }

  async function afterDelete() {
    setSelected(null);
    setDeleteTarget(null);
    setSelectedIds(new Set());
    await load(true);
  }

  const title = TABS.find(([key]) => key === activeTab)?.[1] || "Overview";
  const mrr = metrics.monthly_revenue_estimate || planReport?.monthly_revenue_estimate || 0;

  return (
    <main className="min-h-screen w-full bg-[#05070b] text-white">
      <DetailModal item={selected} onClose={() => setSelected(null)} onDelete={setDeleteTarget} />
      <DeleteAccountModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={afterDelete} />

      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-950/95 p-4 xl:border-b-0 xl:border-r xl:border-slate-800">
          <div className="mb-5 rounded-[28px] border border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
            <div className="mb-4 inline-flex rounded-2xl bg-orange-500 p-3 text-slate-950"><Shield size={24} /></div>
            <h1 className="text-3xl font-black tracking-[-0.06em]">Churvox HQ</h1>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-400">Private app-owner HQ. Run the product, see signups, watch billing, and help users.</p>
            <button type="button" onClick={logoutHQ} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/20">
              <LogOut size={16} /> Log out
            </button>
          </div>

          <nav className="grid gap-2">
            {TABS.map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => openTab(key)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${activeTab === key ? "bg-orange-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}>
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>

          <section className="mt-5 rounded-[24px] border border-slate-800 bg-slate-900/80 p-4 text-sm font-bold text-slate-300">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live status</p>
            <Line label="HQ mode" value="App owner" />
            <Line label="Users" value={allUsers.length} />
            <Line label="Businesses" value={businesses.length} />
            <Line label="Last loaded" value={dateText(data?.generated_at || new Date())} />
          </section>
        </aside>

        <section className="min-w-0 p-4 md:p-6 xl:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[34px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                <Shield size={14} /> App owner HQ
              </div>
              <h2 className="text-4xl font-black tracking-[-0.07em] md:text-6xl">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                See who signed up, who is paying, who is testing, who is active, and who needs help.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadCsv("churvox-users.csv", filteredUsers)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 hover:border-orange-400">
                <Download size={16} /> Export users
              </button>
              <button type="button" onClick={() => load(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-100 hover:bg-orange-500/20">
                <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
              </button>
            </div>
          </header>

          {error ? (
            <div className="mb-5 rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {activeTab !== "overview" ? (
            <section className="mb-5 grid gap-3 rounded-[24px] border border-slate-800 bg-slate-950/70 p-4 lg:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, plan, business..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-orange-500" />
              </label>
              <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500">
                {planOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500">
                {statusOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </section>
          ) : null}

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                <Metric label="Total signups" value={metrics.total_users || allUsers.length || 0} helper={`${newToday.length} new today`} icon={Users} tone="green" />
                <Metric label="Paid users" value={metrics.paid_users || paidUsers.length || 0} helper={`${trialUsers.length} trial · ${noPlanUsers.length} no plan`} icon={CreditCard} tone="green" />
                <Metric label="MRR estimate" value={money(mrr)} helper="Free testers excluded where backend supplies it" icon={DollarSign} tone="green" />
                <Metric label="Active now" value={metrics.active_now || activeNow.length || 0} helper={`${activeToday.length} active today`} icon={Radio} tone="cyan" />
                <Metric label="Businesses" value={metrics.total_businesses || businesses.length || 0} helper={`${supportQueue.length} need help`} icon={Building2} tone="cyan" />
                <Metric label="Payment issues" value={paymentIssues.length} helper="Failed, unpaid, past due or plan required" icon={AlertTriangle} tone={paymentIssues.length ? "red" : "green"} />
                <Metric label="Support queue" value={supportQueue.length} helper="Setup, billing or usage help" icon={LifeBuoy} tone={supportQueue.length ? "amber" : "green"} />
                <Metric label="Invoices" value={metrics.total_invoices || asArray(lists.invoices).length || 0} helper={`${money(metrics.invoice_value_outstanding || 0)} outstanding`} icon={BarChart3} tone="amber" />
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                <article className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black">Newest signups</h3>
                    <button type="button" onClick={() => openTab("signups")} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-black text-white">View all</button>
                  </div>
                  <UserTable rows={signups.slice(0, 8)} onOpen={setSelected} />
                </article>

                <article className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                  <h3 className="mb-4 text-xl font-black">Needs attention</h3>
                  <div className="grid gap-3">
                    {[...paymentIssues, ...supportQueue].slice(0, 10).map((item, idx) => (
                      <button key={`${keyOf(item)}-${idx}`} type="button" onClick={() => setSelected(item)} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-orange-400">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <b className="block truncate text-white">{recordName(item)}</b>
                            <span className="block truncate text-xs font-bold text-slate-500">{short(item.email || item.business_id)}</span>
                          </div>
                          <Pill tone={hasPaymentIssue(item) ? "Payment issue" : healthForBusiness(item, lists)}>{hasPaymentIssue(item) ? "Payment" : healthForBusiness(item, lists)}</Pill>
                        </div>
                      </button>
                    ))}
                    {![...paymentIssues, ...supportQueue].length ? <Empty>Nothing needs attention right now.</Empty> : null}
                  </div>
                </article>
              </section>

              <article className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">Recent activity</h3>
                  <button type="button" onClick={() => openTab("activity")} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-black text-white">View activity</button>
                </div>
                <ActivityGrid rows={events.slice(0, 9)} />
              </article>
            </div>
          ) : null}

          {activeTab === "signups" ? <UserTable rows={filteredSignups} onOpen={setSelected} /> : null}

          {activeTab === "users" ? (
            <div className="space-y-4">
              <section className="sticky top-3 z-20 rounded-[24px] border border-orange-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <b className="text-white">Account management</b>
                    <p className="text-sm font-bold text-slate-400">Select test/bad accounts only. Protected owner accounts cannot be selected.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectVisible} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100">Select visible</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-100">Clear</button>
                    <button type="button" onClick={deleteSelected} disabled={!selectedUsers.length} className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">
                      <Trash2 className="inline-block" size={15} /> Delete selected ({selectedUsers.length})
                    </button>
                  </div>
                </div>
              </section>
              <UserTable rows={filteredUsers} onOpen={setSelected} selectedIds={selectedIds} onToggle={toggleSelect} />
            </div>
          ) : null}

          {activeTab === "businesses" ? <BusinessGrid rows={businesses.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))} lists={lists} onOpen={setSelected} /> : null}

          {activeTab === "billing" ? <UserTable rows={filteredUsers.filter((item) => isPaidUser(item) || isTrialUser(item) || isNoPlan(item) || hasPaymentIssue(item))} onOpen={setSelected} /> : null}

          {activeTab === "activity" ? <ActivityGrid rows={events.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))} /> : null}

          {activeTab === "support" ? <BusinessGrid rows={supportQueue.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))} lists={lists} onOpen={setSelected} /> : null}

          {activeTab === "settings" ? (
            <div className="grid gap-5">
              <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="mb-2 text-xl font-black">HQ access</h3>
                <p className="max-w-2xl text-sm font-bold leading-6 text-slate-400">
                  HQ uses the protected owner API. Keep this private. Use it for checking signups, billing state, setup health, support queue and safe account cleanup.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Metric label="Mode" value="App owner" helper="Private admin only" icon={Shield} tone="green" />
                  <Metric label="API" value={error ? "Check" : "Connected"} helper="/api/admin/owner-overview" icon={CheckCircle} tone={error ? "red" : "green"} />
                  <Metric label="Refresh" value="30 sec" helper="Auto-refreshes while open" icon={Clock} tone="cyan" />
                </div>
              </section>
              <RemoveCustomerDataCard onRemoved={() => load(true)} />
            </div>
          ) : null}

          {loading ? <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-400">Loading Churvox HQ data…</div> : null}
        </section>
      </div>
    </main>
  );
}
