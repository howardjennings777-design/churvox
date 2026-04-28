import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Briefcase, Building2, CreditCard, FileText, LogOut, RefreshCw, ShieldCheck, Trash2, Users, Zap } from "lucide-react";
import API_BASE from "../lib/apiBase";

const ADMIN_ENDPOINTS = [
  "/api/admin/platform-stats",
  "/api/admin/usage",
  "/api/admin/dashboard",
  "/api/platform/stats",
  "/api/app-owner/stats",
];

const FALLBACK_ENDPOINTS = {
  jobs: "/api/jobs",
  clients: "/api/clients",
  quotes: "/api/quotes",
  invoices: "/api/invoices",
  workers: "/api/team/workers",
  automation: "/api/automation/rules",
  notifications: "/api/notifications?limit=20",
  billing: "/api/billing/status",
  reports: "/api/reports/summary?range=this_month",
};

const PLAN_PRICE = { solo: 30, team: 70, pro: 110, enterprise: 240 };
const OWNER_ROLES = new Set(["owner", "employer", "admin", "business_owner", "platform_owner"]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.rules)) return value.rules;
  if (Array.isArray(value?.notifications)) return value.notifications;
  return [];
}

function money(value) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value.$oid || value.id || JSON.stringify(value);
  return String(value);
}

function titleOf(item) {
  return safeText(item?.name || item?.full_name || item?.business_name || item?.company || item?.title || item?.email || item?.customer_name || item?.client_name || item?.invoice_number || item?.quote_number || item?.id || item?._id, "Record");
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.user_id || item?.business_id || item?.email || item?.title;
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.id || "";
  return String(raw);
}

function planOf(userOrBilling) {
  return String(userOrBilling?.plan || userOrBilling?.plan_type || userOrBilling?.subscription_plan || "none").toLowerCase();
}

function roleOf(item) {
  return String(item?.role || item?.user_role || item?.account_role || "").trim().toLowerCase();
}

function isOwnerAccount(item) {
  const role = roleOf(item);
  if (OWNER_ROLES.has(role)) return true;
  if (item?.is_platform_owner === true) return true;
  return false;
}

function splitOwnersAndUsers(rawUsers) {
  const owners = [];
  const users = [];

  rawUsers.forEach((user) => {
    if (isOwnerAccount(user)) owners.push(user);
    else users.push(user);
  });

  return { owners, users };
}

function normalizeAdmin(payload, endpoint) {
  const src = payload?.data && !Array.isArray(payload.data) ? payload.data : payload || {};
  const allUsers = asArray(src.users_list || src.users || src.all_users);
  const { owners, users } = splitOwnersAndUsers(allUsers);
  const businesses = asArray(src.businesses_list || src.businesses || src.companies);
  const jobs = asArray(src.jobs_list || src.jobs);
  const clients = asArray(src.clients_list || src.clients);
  const quotes = asArray(src.quotes_list || src.quotes);
  const invoices = asArray(src.invoices_list || src.invoices);
  const automation = asArray(src.automation_list || src.automation_rules || src.rules);
  const notifications = asArray(src.notifications);
  const plans = { solo: 0, team: 0, pro: 0, enterprise: 0 };
  const planSource = owners.length ? owners : allUsers;
  planSource.forEach((u) => { const p = planOf(u); if (plans[p] !== undefined) plans[p] += 1; });
  const revenue = Number(src.monthly_revenue || src.mrr || src.revenue_this_month || 0) || planSource.reduce((sum, u) => sum + (PLAN_PRICE[planOf(u)] || 0), 0);
  return {
    mode: "Full platform",
    source: endpoint,
    owners,
    users,
    allUsers,
    businesses,
    jobs,
    clients,
    quotes,
    invoices,
    workers: users,
    automation,
    notifications,
    plans: src.plan_counts || plans,
    revenue,
  };
}

function normalizeFallback(results) {
  const jobs = asArray(results.jobs);
  const clients = asArray(results.clients);
  const quotes = asArray(results.quotes);
  const invoices = asArray(results.invoices);
  const workers = asArray(results.workers);
  const automation = asArray(results.automation);
  const notifications = asArray(results.notifications);
  const billing = results.billing || {};
  const reports = results.reports || {};
  const plan = planOf(billing);
  const plans = { solo: 0, team: 0, pro: 0, enterprise: 0 };
  if (plans[plan] !== undefined) plans[plan] = 1;
  const businesses = [{ business_name: billing.business_name || "Current business", plan, status: billing.plan_status || billing.subscription_status || "active" }];
  const owners = [{
    name: billing.name || billing.owner_name || billing.business_name || "Current owner",
    email: billing.email || billing.owner_email || "",
    role: "owner",
    business_name: billing.business_name || "Current business",
    plan,
    plan_status: billing.plan_status || billing.subscription_status || "active",
  }];
  const revenue = Number(reports.revenue_this_month || 0) || PLAN_PRICE[plan] || 0;
  return { mode: "Live fallback", source: "current live app endpoints", owners, users: workers, allUsers: [...owners, ...workers], businesses, jobs, clients, quotes, invoices, workers, automation, notifications, plans, revenue };
}

function Metric({ id, label, value, detail, icon: Icon, selected, onClick }) {
  return (
    <button type="button" onClick={() => onClick(id)} className={`rounded-3xl border p-5 text-left shadow-xl transition ${selected ? "border-cyan-300 bg-cyan-300/15" : "border-white/10 bg-white/[0.06] hover:bg-white/[0.10]"}`}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
          <p className="mt-2 text-xs font-bold text-slate-400">{detail}</p>
        </div>
        <span className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-2.5 text-cyan-200"><Icon className="h-5 w-5" /></span>
      </div>
    </button>
  );
}

function RecordCard({ item, selected, onDeleteUser }) {
  const canDelete = selected === "users" && !isOwnerAccount(item);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-black text-white">{titleOf(item)}</p>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteUser?.(item)}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-red-300/25 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-black text-red-100 hover:bg-red-500/25"
            data-testid="app-owner-delete-user"
            title="Delete user"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-300">
        {Object.entries(item || {}).slice(0, 8).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
            <span className="shrink-0 uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</span>
            <span className="min-w-0 truncate text-right text-slate-200">{safeText(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function selectedLabel(id) {
  const labels = {
    owners: "Owners",
    users: "Users",
    businesses: "Businesses",
    jobs: "Jobs",
    clients: "Clients",
    quotes: "Quotes",
    invoices: "Invoices",
    automation: "Automation",
    notifications: "Notifications",
  };
  return labels[id] || id;
}

export default function AppOwnerPage() {
  const [data, setData] = useState(() => normalizeFallback({}));
  const [selected, setSelected] = useState("owners");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [updated, setUpdated] = useState(null);

  const headers = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch (_) {}

    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    window.location.assign("/login");
  };

  const fetchJson = useCallback(async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: { Accept: "application/json", ...headers() } });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.detail || json?.message || `${path} ${res.status}`);
    return json;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setWarning("");
    try {
      for (const endpoint of ADMIN_ENDPOINTS) {
        try {
          const payload = await fetchJson(endpoint);
          setData(normalizeAdmin(payload, endpoint));
          setUpdated(new Date());
          return;
        } catch (_) {}
      }

      const settled = await Promise.allSettled(Object.entries(FALLBACK_ENDPOINTS).map(async ([key, path]) => [key, await fetchJson(path)]));
      const results = {};
      settled.forEach((r) => { if (r.status === "fulfilled") results[r.value[0]] = r.value[1]; });
      setData(normalizeFallback(results));
      setWarning("Full platform admin endpoints are not live yet. Showing live data available from the current app endpoints.");
      setUpdated(new Date());
    } catch (err) {
      setData(normalizeFallback({}));
      setWarning(err.message || "Owner dashboard could not load live data yet.");
      setUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

  const handleDeleteUser = useCallback(async (item) => {
    const userId = idOf(item);
    const label = titleOf(item);
    if (!userId) {
      setWarning("Could not find this user's ID.");
      return;
    }
    if (isOwnerAccount(item)) {
      setWarning("Owner and platform owner accounts are protected. Delete workers/team users only.");
      return;
    }
    const ok = window.confirm(`Delete user ${label}? This removes the team user account and cannot be undone from the dashboard.`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...headers() },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.detail || json?.message || `Delete failed (${res.status})`);
      setWarning(`Deleted user: ${label}`);
      await load();
      setSelected("users");
    } catch (err) {
      setWarning(err.message || "Could not delete user.");
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const metrics = useMemo(() => [
    { id: "owners", label: "Owners", value: data.owners.length, detail: "business owner accounts", icon: ShieldCheck },
    { id: "users", label: "Users", value: data.users.length, detail: "workers/team users", icon: Users },
    { id: "businesses", label: "Businesses", value: data.businesses.length, detail: data.mode, icon: Building2 },
    { id: "jobs", label: "Jobs", value: data.jobs.length, detail: "live job records", icon: Briefcase },
    { id: "clients", label: "Clients", value: data.clients.length, detail: "customer records", icon: Users },
    { id: "quotes", label: "Quotes", value: data.quotes.length, detail: "sales records", icon: FileText },
    { id: "invoices", label: "Invoices", value: data.invoices.length, detail: "billing records", icon: CreditCard },
    { id: "automation", label: "Automation", value: data.automation.length, detail: "rules visible", icon: Zap },
    { id: "notifications", label: "Notifications", value: data.notifications.length, detail: "recent alerts", icon: Activity },
  ], [data]);

  const records = asArray(data[selected]);
  const totalPlans = Object.values(data.plans || {}).reduce((s, v) => s + Number(v || 0), 0) || 1;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="rounded-[2rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.20),transparent_22rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Churvox platform owner</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Owner Command Centre</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Separate app-owner dashboard for platform health, owners, users, businesses, jobs, invoices, automation and alerts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border border-red-200/25 bg-red-500/15 px-4 py-2 text-sm font-black text-red-100 hover:bg-red-500/25" data-testid="app-owner-logout">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">MRR estimate</p><p className="mt-2 text-xl font-black">{money(data.revenue)}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Mode</p><p className="mt-2 text-sm font-black">{data.mode}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Updated</p><p className="mt-2 text-sm font-black">{updated ? updated.toLocaleTimeString() : "loading"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Access</p><p className="mt-2 text-sm font-black"><ShieldCheck className="mr-1 inline h-4 w-4 text-cyan-300" />hello only</p></div>
          </div>
        </section>

        {warning && <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{warning}</div>}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
          <main className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((m) => <Metric key={m.id} {...m} selected={selected === m.id} onClick={setSelected} />)}
            </div>
            <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
              <h2 className="text-xl font-black">Plan mix</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Object.entries(data.plans || {}).map(([plan, count]) => (
                  <div key={plan} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex justify-between text-sm"><span className="font-bold capitalize text-slate-200">{plan}</span><span className="font-black">{count}</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, (Number(count || 0) / totalPlans) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </main>
          <aside className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
            <h2 className="text-xl font-black">{selectedLabel(selected)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">{records.length} records shown · {data.source}</p>
            <div className="mt-4 max-h-[72vh] space-y-3 overflow-auto pr-1">
              {records.length ? records.map((item, index) => <RecordCard key={idOf(item) || index} item={item} selected={selected} onDeleteUser={handleDeleteUser} />) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm font-semibold text-slate-400">No records yet.</div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
