import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import API_BASE from "../lib/apiBase";

function array(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value.detail || value.message || JSON.stringify(value);
  return String(value);
}

function statusClass(ok, severity) {
  if (ok) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (severity === "critical") return "border-red-300/25 bg-red-500/10 text-red-100";
  return "border-amber-300/25 bg-amber-400/10 text-amber-100";
}

function SectionCard({ title, subtitle, items, emptyText = "No checks returned." }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="grid gap-3">
        {array(items).length ? array(items).map((item, index) => (
          <div key={`${item.label || item.path || item.key || index}`} className={`rounded-2xl border p-4 ${statusClass(item.ok, item.severity)}`}>
            <div className="flex items-start gap-3">
              {item.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> : item.severity === "critical" ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />}
              <div className="min-w-0 flex-1">
                <p className="font-black">{cleanText(item.label || item.path || item.key, "Check")}</p>
                <p className="mt-1 break-words text-xs font-semibold opacity-80">
                  {item.path ? `${item.method || ""} ${item.path}` : item.key ? item.key : item.collection ? `${item.collection} · ${item.count ?? 0}` : item.count !== undefined ? `${item.count}` : cleanText(item.detail || item.status || item.error, "")}
                </p>
              </div>
            </div>
          </div>
        )) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm font-semibold text-slate-400">{emptyText}</div>}
      </div>
    </section>
  );
}

function StatCard({ label, value, icon: Icon, tone = "cyan" }) {
  const toneClass = tone === "green" ? "text-emerald-200 border-emerald-300/20 bg-emerald-400/10" : tone === "amber" ? "text-amber-100 border-amber-300/25 bg-amber-400/10" : tone === "red" ? "text-red-100 border-red-300/25 bg-red-500/10" : "text-cyan-100 border-cyan-300/20 bg-cyan-400/10";
  return (
    <div className={`rounded-3xl border p-5 shadow-xl shadow-black/20 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
        </div>
        <span className="rounded-2xl border border-white/10 bg-white/10 p-2.5"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

export default function LaunchAuditPage() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [error, setError] = useState("");
  const [sweepResult, setSweepResult] = useState(null);

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = window.localStorage?.getItem("token") || window.localStorage?.getItem("authToken") || "";
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.detail || data?.message || `${path} returned ${response.status}`);
    return data;
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/launch/audit");
      setAudit(data);
    } catch (err) {
      setError(err.message || "Could not load launch audit");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const runSweep = async () => {
    setSweeping(true);
    setError("");
    try {
      const result = await apiFetch("/api/launch/sweep-all", { method: "POST" });
      setSweepResult(result);
      await loadAudit();
    } catch (err) {
      setError(err.message || "Could not run launch sweep");
    } finally {
      setSweeping(false);
    }
  };

  const score = Number(audit?.launch_score || 0);
  const status = audit?.status || "loading";
  const issues = array(audit?.issues);
  const criticalIssues = issues.filter((item) => item.severity === "critical").length;
  const warnings = Number(audit?.summary?.warnings || issues.filter((item) => item.severity !== "critical").length || 0);
  const sweepRows = array(sweepResult?.results);

  const scoreTone = useMemo(() => {
    if (score >= 90 && criticalIssues === 0) return "green";
    if (score >= 70) return "amber";
    return "red";
  }, [score, criticalIssues]);

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="launch-audit-page">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.20),transparent_22rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-black text-cyan-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to App Owner</Link>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Churvox launch control</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Launch Audit</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
                Check the real backend wiring, automation status, data health, and launch-blocking issues before you test or go live.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={runSweep} disabled={sweeping} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/15 px-4 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-60">
                <Wrench className={`h-4 w-4 ${sweeping ? "animate-spin" : ""}`} />
                {sweeping ? "Running..." : "Run sweep-all"}
              </button>
              <button type="button" onClick={loadAudit} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm font-semibold text-red-100">{error}</div> : null}

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label="Launch score" value={loading ? "..." : `${score}%`} icon={Rocket} tone={scoreTone} />
          <StatCard label="Status" value={status.replace(/_/g, " ")} icon={ShieldCheck} tone={status === "launch_ready" ? "green" : "amber"} />
          <StatCard label="Critical" value={criticalIssues} icon={XCircle} tone={criticalIssues ? "red" : "green"} />
          <StatCard label="Warnings" value={warnings} icon={AlertTriangle} tone={warnings ? "amber" : "green"} />
        </div>

        {sweepResult ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Latest sweep-all result</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Status: {cleanText(sweepResult.status)} · Failed: {sweepResult.failed_count || 0}</p>
              </div>
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sweepRows.map((item) => (
                <div key={item.name} className={`rounded-2xl border p-4 ${statusClass(item.ok, item.ok ? "ok" : "warning")}`}>
                  <p className="font-black">{cleanText(item.name).replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs font-semibold opacity-80">{item.ok ? `${item.duration_ms || 0}ms` : cleanText(item.error)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SectionCard title="Config" subtitle="Important environment/config signals." items={audit?.config} />
          <SectionCard title="Routes" subtitle="Main backend route surface Churvox needs for launch." items={audit?.routes} />
          <SectionCard title="Workflow health" subtitle="Real workflow backlog and automation warning checks." items={audit?.workflows} />
          <SectionCard title="Data collections" subtitle="Live collection counts from the backend." items={audit?.data} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SectionCard title="Current issues" subtitle="Items that need attention before launch." items={audit?.issues} emptyText="No launch issues found by backend audit." />
          <SectionCard title="Recent automation errors" subtitle="Latest failed automation runs." items={audit?.recent_errors} emptyText="No recent automation errors returned." />
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-slate-600">
          Checked: {audit?.checked_at || "not loaded yet"}
        </p>
      </div>
    </div>
  );
}
