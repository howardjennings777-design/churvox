import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, RefreshCw, Copy } from "lucide-react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const promptButtons = [
  ["attention", "What needs attention today?"],
  ["invoice_followup", "Draft invoice follow-up"],
  ["jobs_summary", "Summarise today’s jobs"],
  ["automation_suggestions", "Suggest automations"],
  ["jobs_needing_action", "Find jobs needing action"],
];

const quickActions = [["New job", "/jobs/new"], ["Jobs", "/jobs"], ["Clients", "/clients"], ["Quotes", "/quotes"], ["Invoices", "/invoices"]];

export default function SmartHubPage() {
  const { get, post } = useApi();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [assistant, setAssistant] = useState("Draft only: Use the buttons below for business-safe assistant guidance.");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [hubRes, jobsRes, quotesRes, invoicesRes, teamRes, runsRes] = await Promise.allSettled([
      get("/smart-hub/summary"), get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/automation/runs?limit=10"),
    ]);
    const safe = hubRes.status === "fulfilled" && hubRes.value?.success ? hubRes.value.data : {};
    setSummary({
      today_jobs: jobsRes.status === "fulfilled" && jobsRes.value?.success ? (jobsRes.value.data || []).filter((j) => (j.scheduled_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length : 0,
      jobs_in_progress: jobsRes.status === "fulfilled" && jobsRes.value?.success ? (jobsRes.value.data || []).filter((j) => String(j.status || "").toLowerCase() === "in_progress").length : 0,
      overdue_jobs: jobsRes.status === "fulfilled" && jobsRes.value?.success ? (jobsRes.value.data || []).filter((j) => String(j.status || "").toLowerCase() === "overdue").length : 0,
      open_quotes: quotesRes.status === "fulfilled" && quotesRes.value?.success ? (quotesRes.value.data || []).filter((q) => ["draft", "sent", "open"].includes(String(q.status || "").toLowerCase())).length : 0,
      unpaid_invoices: invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? (invoicesRes.value.data || []).filter((i) => !["paid", "cancelled"].includes(String(i.status || "").toLowerCase())).length : 0,
      team_members: teamRes.status === "fulfilled" && teamRes.value?.success ? (teamRes.value.data || []).length : 0,
      automation_issues: runsRes.status === "fulfilled" && runsRes.value?.success ? ((runsRes.value.data?.runs || runsRes.value.data || []).filter((r) => String(r.status || "") === "failed").slice(0, 3)) : [],
      urgent_followups: safe.urgent_followups || [],
      health_score: safe.health_score || 0,
      ...safe,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const askAssistant = async (promptType) => {
    setAssistantLoading(true);
    const res = await post("/ai/business-assistant", { prompt_type: promptType });
    setAssistant((res?.success && res?.data?.response) || "Draft only: Focus on overdue jobs, unpaid invoices, and open quotes first.");
    setAssistantLoading(false);
  };

  const cards = useMemo(() => ([
    ["Today’s jobs", summary.today_jobs || 0], ["Jobs in progress", summary.jobs_in_progress || 0], ["Overdue jobs", summary.overdue_jobs || 0], ["Open quotes", summary.open_quotes || 0],
    ["Unpaid invoices", summary.unpaid_invoices || 0], ["Team members", summary.team_members || 0],
  ]), [summary]);

  return <Layout><div className="cx-page space-y-5 pb-16"><div className="rounded-3xl bg-slate-900 p-6 text-white"><h1 className="text-4xl font-black">Smart Hub</h1><p className="text-slate-100 mt-2">Approval-first command centre.</p><div className="mt-4 flex gap-2 flex-wrap">{quickActions.map(([label, href], i) => <Link key={href} to={href} className={i === 0 ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white" : "rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900"}>{label}</Link>)}</div></div>
    <div className="flex items-center gap-3"><button onClick={load} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-black inline-flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button><p className="text-sm text-slate-700">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}</p></div>
    <div className="grid md:grid-cols-3 gap-3">{cards.map(([t,v]) => <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-700">{t}</p><p className="text-3xl font-black text-slate-950">{v}</p></div>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-black text-slate-950">AI Business Assistant <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">Draft only</span></h2><div className="mt-3 flex flex-wrap gap-2">{promptButtons.map(([id,label]) => <button key={id} onClick={() => askAssistant(id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900">{label}</button>)}</div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-800 text-sm font-semibold min-h-20">{assistantLoading ? "Loading assistant response…" : assistant}</div><div className="mt-3 flex gap-2"><button onClick={() => navigator.clipboard.writeText(assistant)} className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-900 font-black inline-flex items-center gap-2"><Copy className="h-4 w-4" />Copy</button><Link to="/jobs" className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-900 font-black">Open Jobs</Link><Link to="/invoices" className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-900 font-black">Open Invoices</Link></div></div>
    <div className="grid md:grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">Urgent follow-ups</p><ul className="text-slate-700 text-sm mt-2 list-disc pl-4">{(summary.urgent_followups || []).slice(0,5).map((f, i) => <li key={i}>{typeof f === "string" ? f : f?.title || f?.message || "Follow-up item"}</li>)}{!(summary.urgent_followups || []).length && <li>No urgent follow-ups.</li>}</ul></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">Automation issues</p><ul className="text-slate-700 text-sm mt-2 list-disc pl-4">{(summary.automation_issues || []).map((r, i) => <li key={i}>{r.rule_name || "Automation rule"} failed</li>)}{!(summary.automation_issues || []).length && <li>No automation issues.</li>}</ul></div></div>
  </div></Layout>;
}
