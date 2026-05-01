import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useApi } from "../../hooks/useApi";

function Pill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="text-xl font-black text-slate-950">{value ?? 0}</p>
    </div>
  );
}

export default function AIBusinessBriefCard() {
  const navigate = useNavigate();
  const { get } = useApi();
  const [brief, setBrief] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const briefRes = await get("/ai/brief");
      const actionRes = await get("/ai/urgent-actions");
      if (briefRes.success) setBrief(briefRes.data);
      if (actionRes.success) setActions(Array.isArray(actionRes.data?.actions) ? actionRes.data.actions : []);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600"><RefreshCw className="h-4 w-4 animate-spin" />Loading AI Assistant...</div>
      </section>
    );
  }

  const c = brief?.counts || {};
  return (
    <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-slate-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" />Churvox AI Assistant</div>
          <h2 className="text-xl font-black text-slate-950">Today’s Business Brief</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{brief?.brief || "AI Assistant is ready to help you see what needs attention today."}</p>
        </div>
        <Button type="button" onClick={() => navigate("/smart-hub")} className="bg-blue-600 hover:bg-blue-700">Ask AI<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Pill label="Today" value={c.jobs_today} />
        <Pill label="Overdue jobs" value={c.jobs_overdue} />
        <Pill label="Unassigned" value={c.unassigned_jobs} />
        <Pill label="Quotes" value={c.pending_quotes} />
        <Pill label="Unpaid" value={c.unpaid_invoices} />
        <Pill label="Overdue inv." value={c.overdue_invoices} />
        <Pill label="No invoice" value={c.completed_jobs_without_invoice} />
        <Pill label="Alerts" value={c.alerts_total} />
      </div>

      <div className="mt-5 space-y-2">
        {actions.slice(0, 4).map((item, index) => (
          <button key={index} type="button" onClick={() => item.route && navigate(item.route)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-blue-50">
            <p className="text-sm font-bold text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-600">{item.description}</p>
          </button>
        ))}
        {!actions.length && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">Nothing urgent right now.</p>}
      </div>
    </section>
  );
}
