import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";

const STATUS_COLOR = {
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  skipped: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function AutomationRunsPage() {
  const { get } = useApi();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await get("/automation/runs?limit=100");
    if (r?.success) setRuns(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-6 w-6 text-blue-600" /> Automation runs
            </h1>
            <p className="text-sm text-slate-500">Recent rule executions in this business.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/automation"><ArrowLeft className="h-4 w-4 mr-1" /> Back to rules</Link>
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No runs yet.</div>
          ) : (
            runs.map((r) => {
              const isOpen = !!expanded[r.id];
              return (
                <div key={r.id} className="border-b border-slate-100" data-testid={`run-row-${r.id}`}>
                  <button
                    onClick={() => setExpanded({ ...expanded, [r.id]: !isOpen })}
                    className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{r.rule_name || "Rule"}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{r.trigger}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{r.status}</span>
                        {r.test && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">test</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(r.started_at).toLocaleString()} · {r.results?.length || 0} action(s)
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 space-y-3 bg-slate-50/50">
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Event payload</div>
                        <pre className="text-[11px] bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-40">{JSON.stringify(r.event_payload, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Action results</div>
                        <div className="space-y-1">
                          {(r.results || []).map((res, i) => (
                            <div key={i} className={`text-[11px] border rounded p-2 bg-white ${res.ok ? "border-slate-200" : "border-red-200"}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{res.type}</span>
                                <span className={res.ok ? "text-green-600" : "text-red-600"}>{res.ok ? "ok" : "failed"}</span>
                              </div>
                              {res.message && <div className="text-slate-600 mt-0.5">{res.message}</div>}
                              {res.error && <div className="text-red-600 mt-0.5">{res.error}</div>}
                              {res.notification_id && <div className="text-slate-500 mt-0.5">notification: {res.notification_id}</div>}
                              {res.job_id && <div className="text-slate-500 mt-0.5">job: {res.job_id}</div>}
                              {res.invoice_id && <div className="text-slate-500 mt-0.5">invoice: {res.invoice_id}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                      {r.error && <div className="text-xs text-red-600">Error: {r.error}</div>}
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
