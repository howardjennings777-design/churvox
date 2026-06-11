// CHURVOX_REAL_PLATFORM_OWNER_COCKPIT_20260611

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Eye,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import API_BASE from "../lib/apiBase";

const TABS = [
  ["visitors", "Visitors"],
  ["active_now", "On now"],
  ["users", "Users"],
  ["businesses", "Businesses"],
  ["paid_users", "Paid / buyers"],
  ["trial_users", "Trials"],
  ["test_preview", "Old test data"],
  ["events", "Live events"],
];

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
    return new Date(value).toLocaleString("en-NZ");
  } catch {
    return String(value);
  }
}

function short(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function itemId(item) {
  return item?._id || item?.id || item?.email || item?.path || "";
}

function recordName(item) {
  return (
    item?.name ||
    item?.full_name ||
    item?.business_name ||
    item?.company ||
    item?.email ||
    item?.title ||
    item?.path ||
    item?.customer_name ||
    item?.client_name ||
    "Record"
  );
}

function MetricCard({ label, value, helper, icon: Icon, accent = "cyan" }) {
  const accentClass =
    accent === "green"
      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
      : accent === "amber"
      ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
      : accent === "red"
      ? "text-red-300 bg-red-500/10 border-red-500/20"
      : "text-cyan-300 bg-cyan-500/10 border-cyan-500/20";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        {Icon ? <div className={`rounded-xl border p-2 ${accentClass}`}><Icon size={18} /></div> : null}
      </div>
      <div className="text-3xl font-black tracking-tight text-white">{value}</div>
      {helper ? <div className="mt-1 text-xs font-semibold text-slate-400">{helper}</div> : null}
    </div>
  );
}

function Line({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 border-t border-slate-800 py-2 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-100">{String(value)}</span>
    </div>
  );
}

function RecordCard({ item, type, onDeleteUser, onDeleteBusiness, busy }) {
  const id = itemId(item);
  const isUser = ["users", "paid_users", "trial_users", "active_today"].includes(type);
  const isBusiness = type === "businesses";
  const isVisitor = ["visitors", "active_now"].includes(type);
  const isEvent = type === "events";

  if (type === "test_preview") {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-black text-white">{item.collection}</div>
            <p className="text-xs text-amber-200">{item.count || item.matched || 0} possible old test records</p>
          </div>
          <AlertTriangle className="text-amber-300" size={18} />
        </div>
        {Array.isArray(item.examples) && item.examples.length ? (
          <div className="mt-3 space-y-2">
            {item.examples.slice(0, 4).map((ex, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                {recordName(ex)} {ex.email ? `• ${ex.email}` : ""}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{recordName(item)}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {isVisitor ? short(item.ip || item.referrer || item.user_agent) : short(item.email || item.business_name || item.meta || item.status)}
          </p>
        </div>

        {isUser && id ? (
          <button
            onClick={() => onDeleteUser(id)}
            disabled={busy === id}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            title="Delete user"
          >
            <Trash2 size={15} />
          </button>
        ) : null}

        {isBusiness && id ? (
          <button
            onClick={() => onDeleteBusiness(id)}
            disabled={busy === id}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            title="Delete business/workspace"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>

      {isVisitor ? (
        <>
          <Line label="Path" value={item.path} />
          <Line label="Referrer" value={item.referrer} />
          <Line label="Source" value={item.source} />
          <Line label="Time" value={dateText(item.created_at)} />
          <Line label="Device" value={item.user_agent} />
        </>
      ) : isEvent ? (
        <>
          <Line label="Type" value={item.label || item.kind} />
          <Line label="Meta" value={item.meta} />
          <Line label="When" value={dateText(item.at)} />
        </>
      ) : (
        <>
          <Line label="Email" value={item.email} />
          <Line label="Phone" value={item.phone || item.mobile} />
          <Line label="Business" value={item.business_name || item.company} />
          <Line label="Plan" value={item.plan || item.subscription_plan} />
          <Line label="Status" value={item.status || item.subscription_status || item.billing_status} />
          <Line label="Created" value={dateText(item.created_at || item.createdAt)} />
          <Line label="Last active" value={dateText(item.last_active || item.last_login || item.updated_at)} />
          <Line label="ID" value={id} />
        </>
      )}
    </div>
  );
}

export default function AppOwnerPage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("visitors");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [cleanup, setCleanup] = useState(null);
  const [query, setQuery] = useState("");

  const token = () => {
    try { return window.localStorage.getItem("token") || ""; } catch { return ""; }
  };

  const request = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.detail || body?.message || `Request failed: ${res.status}`);
    }
    return body;
  }, []);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const next = await request("/api/admin/owner-overview");
      setData(next);
    } catch (err) {
      setError(err?.message || "Could not load platform owner data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function deleteUser(id) {
    if (!id) return;
    if (!window.confirm("Delete this user account? This cannot be undone.")) return;
    setBusy(id);
    try {
      await request(`/api/admin/owner/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("User deleted");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not delete user");
    } finally {
      setBusy("");
    }
  }

  async function deleteBusiness(id) {
    if (!id) return;
    const confirmText = window.prompt("Type DELETE BUSINESS to remove this business/workspace and its records.");
    if (confirmText !== "DELETE BUSINESS") return;
    setBusy(id);
    try {
      await request(`/api/admin/owner/businesses/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Business/workspace deleted");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not delete business");
    } finally {
      setBusy("");
    }
  }

  async function previewCleanup() {
    setBusy("cleanup-preview");
    try {
      const res = await request("/api/admin/owner/cleanup-tests", {
        method: "POST",
        body: JSON.stringify({ dry_run: true }),
      });
      setCleanup(res);
      toast.success("Test-data preview loaded");
    } catch (err) {
      toast.error(err?.message || "Could not preview cleanup");
    } finally {
      setBusy("");
    }
  }

  async function runCleanup() {
    const confirmText = window.prompt("Type DELETE TEST DATA to remove old test/demo/sample records.");
    if (confirmText !== "DELETE TEST DATA") return;
    setBusy("cleanup-run");
    try {
      const res = await request("/api/admin/owner/cleanup-tests", {
        method: "POST",
        body: JSON.stringify({ dry_run: false }),
      });
      setCleanup(res);
      toast.success("Old test data cleanup complete");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not run cleanup");
    } finally {
      setBusy("");
    }
  }

  const metrics = data?.metrics || {};
  const lists = data?.lists || {};

  const activeList = useMemo(() => {
    const list = Array.isArray(lists[activeTab]) ? lists[activeTab] : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [lists, activeTab, query]);

  const cleanupRows = cleanup?.collections || lists.test_preview || [];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-cyan-500/20 bg-slate-900/80 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
              <Shield size={14} /> Platform owner
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Churvox Control Room</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-400">
              See who is using Churvox, who bought, who visited, what is active, and clean out old test data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => load(false)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-500/20"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh live data
          </button>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Visitors today" value={metrics.visitors_today || 0} helper={`${metrics.unique_visitors_today || 0} unique · ${metrics.visitors_7d || 0} last 7 days`} icon={Globe2} />
          <MetricCard label="On now" value={metrics.active_now || 0} helper="Visitors in last 15 minutes" icon={Eye} accent="green" />
          <MetricCard label="Total users" value={metrics.total_users || 0} helper={`${metrics.active_today || 0} active today`} icon={Users} />
          <MetricCard label="Businesses" value={metrics.total_businesses || 0} helper="Owner workspaces" icon={Building2} />
          <MetricCard label="Paid / buyers" value={metrics.paid_users || 0} helper="Users with paid/active plan signals" icon={CreditCard} accent="green" />
          <MetricCard label="Trials" value={metrics.trial_users || 0} helper="Trialing users" icon={UserCheck} accent="amber" />
          <MetricCard label="Revenue estimate" value={money(metrics.monthly_revenue_estimate || 0)} helper={`${money(metrics.invoice_value_outstanding || 0)} invoice outstanding`} icon={DollarSign} accent="green" />
          <MetricCard label="Jobs / invoices" value={`${metrics.total_jobs || 0} / ${metrics.total_invoices || 0}`} helper={`${metrics.total_clients || 0} clients · ${money(metrics.invoice_value_total || 0)} invoiced`} icon={MousePointerClick} />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500">Owner tools</h2>
              <div className="grid gap-2">
                {TABS.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                      activeTab === key ? "bg-cyan-500 text-slate-950" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-amber-100">
                <AlertTriangle size={16} /> Old test cleanup
              </h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-amber-200/80">
                Preview first. Protected owner emails will not be deleted.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  onClick={previewCleanup}
                  disabled={busy === "cleanup-preview"}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Preview test data
                </button>
                <button
                  onClick={runCleanup}
                  disabled={busy === "cleanup-run"}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Delete old test data
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500">Plans</h2>
              <div className="space-y-2">
                {Object.entries(metrics.plan_counts || {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-2 text-sm">
                    <span className="font-bold text-slate-300">{plan}</span>
                    <span className="font-black text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">{TABS.find(([k]) => k === activeTab)?.[1] || "Records"}</h2>
                <p className="text-xs font-semibold text-slate-500">
                  {activeTab === "test_preview" ? `${cleanupRows.length} collections with matches` : `${activeList.length} records`}
                </p>
              </div>

              {activeTab !== "test_preview" ? (
                <label className="relative block md:w-72">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search records..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-sm font-semibold text-white outline-none focus:border-cyan-500"
                  />
                </label>
              ) : null}
            </div>

            {activeTab === "test_preview" ? (
              <div className="space-y-3">
                {cleanupRows.length ? (
                  cleanupRows.map((row, idx) => (
                    <RecordCard key={`${row.collection}-${idx}`} item={row} type="test_preview" />
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-8 text-center text-slate-400">
                    <CheckCircle className="mx-auto mb-3 text-emerald-300" />
                    No old test records found.
                  </div>
                )}
              </div>
            ) : activeList.length ? (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {activeList.map((item, idx) => (
                  <RecordCard
                    key={`${activeTab}-${itemId(item) || idx}`}
                    item={item}
                    type={activeTab}
                    busy={busy}
                    onDeleteUser={deleteUser}
                    onDeleteBusiness={deleteBusiness}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-8 text-center text-slate-400">
                No records returned for this section yet.
              </div>
            )}
          </section>
        </section>

        {loading ? <div className="text-sm font-bold text-slate-500">Loading owner data…</div> : null}
      </div>
    </main>
  );
}
