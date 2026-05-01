import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, RotateCw, Search, CheckCircle2, XCircle, Clock, CircleDashed, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE = {
  success: { cls: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle2 },
  completed: { cls: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle2 },
  error: { cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  failed: { cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  running: { cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: Clock },
  skipped: { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: CircleDashed },
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const durationMs = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const d = new Date(endIso).getTime() - new Date(startIso).getTime();
  return d >= 0 ? d : null;
};

function asList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
}


export default function AutomationRunsPage() {
  const { get, post } = useApi();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [retrying, setRetrying] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = statusFilter ? `?limit=100&status=${statusFilter}` : "?limit=100";
      const r = await get(`/automation/runs${qs}`);
      if (r?.success) {
        setRuns(asList(r.data, "runs"));
      } else {
        setRuns([]);
        setError(r?.error || "Could not load automation runs.");
      }
    } catch (_err) {
      setRuns([]);
      setError("Could not load automation runs.");
    } finally {
      setLoading(false);
    }
  }, [get, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const retry = async (runId) => {
    setRetrying((s) => ({ ...s, [runId]: true }));
    const res = await post(`/automation/runs/${runId}/retry`);
    setRetrying((s) => ({ ...s, [runId]: false }));
    if (res?.success) {
      toast.success(`Retry: ${res.data?.run?.status || "started"}`);
      load();
    } else {
      toast.error(res?.error || "Retry failed");
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return runs;
    return runs.filter((r) =>
      (r.rule_name || "").toLowerCase().includes(s) ||
      (r.trigger || "").toLowerCase().includes(s)
    );
  }, [runs, search]);

  const counts = useMemo(() => {
    const c = { total: runs.length, completed: 0, failed: 0, running: 0, skipped: 0 };
    for (const r of runs) { if (c[r.status] !== undefined) c[r.status] += 1; }
    return c;
  }, [runs]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-6 w-6 text-blue-600" /> Automation runs
            </h1>
            <p className="text-sm text-slate-500">Every time a rule executes, it lands here.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/automation"><ArrowLeft className="h-4 w-4 mr-1" /> Back to rules</Link>
          </Button>
        </div>

        {/* Stat pills */}
        {runs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <StatPill label="Total" value={counts.total} onClick={() => setStatusFilter("")} active={!statusFilter} />
            <StatPill label="Completed" value={counts.completed} tone="green" onClick={() => setStatusFilter("completed")} active={statusFilter === "completed"} />
            <StatPill label="Failed" value={counts.failed} tone="red" onClick={() => setStatusFilter("failed")} active={statusFilter === "failed"} />
            <StatPill label="Running" value={counts.running} tone="blue" onClick={() => setStatusFilter("running")} active={statusFilter === "running"} />
            <StatPill label="Skipped" value={counts.skipped} tone="slate" onClick={() => setStatusFilter("skipped")} active={statusFilter === "skipped"} />
          </div>
        )}

        {runs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by rule name or trigger..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900"
                data-testid="runs-search"
              />
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <History className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                {runs.length === 0 ? "No runs yet." : "No runs match your search."}
              </p>
              {runs.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">Once a rule matches an event, it'll appear here.</p>
              )}
            </div>
          ) : (
            filtered.map((r) => {
              const isOpen = !!expanded[r.id];
              const canRetry = r.status === "failed" && !!r.rule_id;
              const style = STATUS_STYLE[r.status] || STATUS_STYLE.skipped;
              const dur = durationMs(r.started_at, r.finished_at);
              const failed = (r.results || []).filter((x) => !x.ok).length;
              return (
                <div key={r.id} className="border-b border-slate-100" data-testid={`run-row-${r.id}`}>
                  <div className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                    <button
                      onClick={() => setExpanded({ ...expanded, [r.id]: !isOpen })}
                      className="min-w-0 flex-1 text-left flex items-start gap-3"
                    >
                          <span className="mt-0.5 text-slate-500">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{r.rule_name || "Rule"}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{r.trigger}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${style.cls}`}>
                            <style.Icon className="h-3 w-3" />
                            {r.status}
                          </span>
                          {r.test && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">test</span>}
                          {r.status === "completed" && failed > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {failed} action error(s)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{timeAgo(r.started_at)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{r.results?.length || 0} action(s)</span>
                          {dur !== null && (<><span className="text-slate-300">·</span><span>{dur}ms</span></>)}
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">{new Date(r.started_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                    {canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!retrying[r.id]}
                        onClick={() => retry(r.id)}
                        data-testid={`retry-run-${r.id}`}
                      >
                        <RotateCw className={`h-3 w-3 mr-1 ${retrying[r.id] ? "animate-spin" : ""}`} />
                        Retry
                      </Button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 space-y-3 bg-slate-50/50 border-t border-slate-100">
                      <CollapsibleBlock label="Action results">
                        <div className="space-y-1.5">
                          {(r.results || []).map((res, i) => (
                            <div key={i} className={`rounded-md p-2.5 bg-white border ${res.ok ? "border-slate-200" : "border-red-200"}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${
                                  res.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                  {res.ok
                                    ? <CheckCircle2 className="h-3 w-3" />
                                    : <XCircle className="h-3 w-3" />}
                                  {res.ok ? "ok" : "failed"}
                                </span>
                                <span className="font-mono text-[11px] text-slate-700">{res.type}</span>
                              </div>
                              {res.message && <div className="text-[11px] text-slate-600 mt-1">{res.message}</div>}
                              {res.error && <div className="text-[11px] text-red-600 mt-1">{res.error}</div>}
                              <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                {res.notification_id && <span>notification: <span className="font-mono">{res.notification_id}</span></span>}
                                {res.job_id && <span>job: <span className="font-mono">{res.job_id}</span></span>}
                                {res.invoice_id && <span>invoice: <span className="font-mono">{res.invoice_id}</span></span>}
                                {res.task_id && <span>task: <span className="font-mono">{res.task_id}</span></span>}
                                {res.activity_id && <span>activity: <span className="font-mono">{res.activity_id}</span></span>}
                                {res.matched !== undefined && <span>matched: {res.matched}</span>}
                                {res.modified !== undefined && <span>modified: {res.modified}</span>}
                              </div>
                            </div>
                          ))}
                          {(!r.results || r.results.length === 0) && <div className="text-xs text-slate-500">No actions executed.</div>}
                        </div>
                      </CollapsibleBlock>

                      <CollapsibleBlock label="Event payload" defaultOpen={false}>
                        <pre className="text-[11px] bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-52">{JSON.stringify(r.event_payload, null, 2)}</pre>
                      </CollapsibleBlock>

                      {r.error && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                          <span className="font-semibold">Rule error: </span>{r.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatPill({ label, value, tone = "slate", onClick, active }) {
  const tones = {
    slate: active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400",
    green: active ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-200 hover:border-green-400",
    red: active ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-200 hover:border-red-400",
    blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:border-blue-400",
  };
  return (
    <button onClick={onClick} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${tones[tone]}`}>
      {label} <span className="font-bold">{value}</span>
    </button>
  );
}

function CollapsibleBlock({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] uppercase tracking-wide font-semibold text-slate-500 hover:text-slate-700"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
