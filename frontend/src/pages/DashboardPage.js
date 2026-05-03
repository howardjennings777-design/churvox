import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Calendar, FileText, Receipt, Users, X } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { safeArray, safeText } from "../utils/safeRender";

const OWNER_ROLES = ["owner", "manager", "office_admin"];
const today = () => new Date().toISOString().slice(0, 10);
const ACTION_PRIORITY = { invoice_reminder: 1, assign_worker: 2, create_invoice_draft: 3, quote_follow_up: 4, client_cleanup: 5, crew_workload: 6 };

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
    <div className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b"><h3 className="font-semibold">{title}</h3><button onClick={onClose}><X className="h-4 w-4"/></button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const isOwnerHub = OWNER_ROLES.includes(normalizedRole);
  const [state, setState] = useState({ loading: true, error: "", jobs: [], quotes: [], invoices: [], workers: [], clients: [], approvals: [] });
  const [activeModal, setActiveModal] = useState("");
  const [askInput, setAskInput] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [selectedActionId, setSelectedActionId] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");
  const [status, setStatus] = useState({ state: "Ready", last_scan_at: "" });

  const makeLocalActions = useCallback((jobs, quotes, invoices, clients, workers) => {
    const unassigned = jobs.filter((j) => !j.assigned_worker_id);
    const overdue = invoices.filter((i) => String(i.status || "") === "overdue");
    const completed = jobs.filter((j) => String(j.status || "") === "completed");
    const waitingQuotes = quotes.filter((q) => ["sent", "pending", "waiting"].includes(String(q.status || "")));
    const sparseClients = clients.filter((c) => !c.email || !c.phone || !c.address);
    return [
      ...overdue.map((i) => ({ id: `local-invoice-${i.id || i._id}`, action_type: "invoice_reminder", title: `Reminder: ${safeText(i.invoice_number, "Invoice")}`, reason: "Invoice is overdue", risk: "medium", related: { type: "invoice", id: i.id || i._id }, draft_preview: `Reminder for ${safeText(i.client_name, "client")}`, status: "prepared", payload: i })),
      ...unassigned.map((j) => ({ id: `local-job-${j.id || j._id}`, action_type: "assign_worker", title: `Assign worker: ${safeText(j.title, "Job")}`, reason: "Job is unassigned", risk: "high", related: { type: "job", id: j.id || j._id }, draft_preview: "Suggested available worker assignment", status: "prepared", payload: j })),
      ...completed.map((j) => ({ id: `local-completed-${j.id || j._id}`, action_type: "create_invoice_draft", title: `Create draft invoice: ${safeText(j.title, "Job")}`, reason: "Completed job ready to invoice", risk: "medium", related: { type: "job", id: j.id || j._id }, draft_preview: "Draft invoice from completed work", status: "prepared", payload: j })),
      ...waitingQuotes.map((q) => ({ id: `local-quote-${q.id || q._id}`, action_type: "quote_follow_up", title: `Quote follow-up: ${safeText(q.title || q.reference, "Quote")}`, reason: "Quote waiting for response", risk: "low", related: { type: "quote", id: q.id || q._id }, draft_preview: "Prepared follow-up message draft", status: "prepared", payload: q })),
      ...sparseClients.slice(0, 5).map((c) => ({ id: `local-client-${c.id || c._id}`, action_type: "client_cleanup", title: `Client data cleanup: ${safeText(c.name, "Client")}`, reason: "Missing contact details", risk: "low", related: { type: "client", id: c.id || c._id }, draft_preview: "Request missing phone/email/address", status: "prepared", payload: c })),
      ...(workers.length ? [{ id: "local-crew", action_type: "crew_workload", title: "Crew workload review", reason: "Balance active jobs across crew", risk: "low", related: { type: "team" }, draft_preview: "Redistribute assignments if overloaded", status: "prepared", payload: {} }] : []),
    ];
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const [jobs, quotes, invoices, workers, clients, approvals] = await Promise.all([
        get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/clients"), isOwnerHub ? get("/ai/operator/actions").catch(() => get("/ai/operator/approvals").catch(() => get("/ai/operator/approval-items"))) : Promise.resolve({ data: [] }),
      ]);
      const j = safeArray(jobs?.data); const q = safeArray(quotes?.data); const i = safeArray(invoices?.data); const w = safeArray(workers?.data); const c = safeArray(clients?.data);
      const loadedApprovals = safeArray(approvals?.data);
      const normalized = loadedApprovals.map((a, idx) => ({ ...a, id: a.id || a._id || `api-${idx}`, action_type: safeText(a.action_type || a.type, "customer_update"), risk: safeText(a.risk, "medium"), status: safeText(a.status, "prepared") }));
      const actions = normalized.length ? normalized : makeLocalActions(j, q, i, c, w);
      setState({ loading: false, error: "", jobs: j, quotes: q, invoices: i, workers: w, clients: c, approvals: actions });
      setStatus((s) => ({ ...s, state: actions.length ? "Needs approval" : "Ready" }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: safeText(e, "Failed to load command centre") }));
    }
  }, [get, isOwnerHub, makeLocalActions]);
  useEffect(() => { load(); }, [load]);

  const sortedApprovals = useMemo(() => safeArray(state.approvals).slice().sort((a, b) => (ACTION_PRIORITY[safeText(a.action_type, "")] || 99) - (ACTION_PRIORITY[safeText(b.action_type, "")] || 99)), [state.approvals]);
  const filteredApprovals = useMemo(() => queueFilter === "all" ? sortedApprovals : sortedApprovals.filter((a) => safeText(a.action_type, "") === queueFilter), [sortedApprovals, queueFilter]);
  useEffect(() => { if (!selectedActionId && filteredApprovals.length) setSelectedActionId(filteredApprovals[0].id); }, [filteredApprovals, selectedActionId]);
  useEffect(() => { if (selectedActionId && !filteredApprovals.find((a) => a.id === selectedActionId)) setSelectedActionId(filteredApprovals[0]?.id || ""); }, [filteredApprovals, selectedActionId]);
  const selected = filteredApprovals.find((a) => a.id === selectedActionId) || filteredApprovals[0] || null;

  const d = useMemo(() => {
    const todayJobs = state.jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === today());
    const unassigned = state.jobs.filter((j) => !j.assigned_worker_id);
    const ready = state.jobs.filter((j) => String(j.status || "") === "completed");
    const quotesWaiting = state.quotes.filter((q) => ["sent", "draft", "pending", "waiting"].includes(String(q.status || "")));
    const openInvoices = state.invoices.filter((i) => ["draft", "sent", "overdue", "unpaid"].includes(String(i.status || "")));
    const crew = new Set(state.jobs.map((j) => j.assigned_worker_id).filter(Boolean)).size;
    return { todayJobs, unassigned, ready, quotesWaiting, openInvoices, crew };
  }, [state]);

  const runBrainScan = async () => {
    setStatus((s) => ({ ...s, state: "Scanning" }));
    try {
      await post("/ai/operator/run-scan", {});
      setStatus({ state: "Needs approval", last_scan_at: new Date().toISOString() });
      toast.success("Brain scan complete");
      load();
    } catch (_e1) {
      try {
        await post("/ai/operator/run-daily-check", {});
        setStatus({ state: "Needs approval", last_scan_at: new Date().toISOString() });
        toast.success("Daily check complete");
        load();
      } catch (e) {
        const fallback = makeLocalActions(state.jobs, state.quotes, state.invoices, state.clients, state.workers);
        setState((s) => ({ ...s, approvals: fallback }));
        setStatus((s) => ({ ...s, state: "Needs approval" }));
        toast.warning(`Scan unavailable: ${safeText(e, "Using prepared local actions")}`);
      }
    }
  };

  const prepareToday = async () => {
    try {
      await post("/ai/operator/prepare-today", {});
      toast.success("Prepared today's actions");
      load();
    } catch {
      const fallback = makeLocalActions(state.jobs, state.quotes, state.invoices, state.clients, state.workers);
      setState((s) => ({ ...s, approvals: fallback }));
      setSelectedActionId(fallback[0]?.id || "");
    }
  };
  const askAi = async () => { try { const r = await post("/ai/operator/ask", { prompt: askInput }); setAskAnswer(safeText(r?.data?.answer || r?.data || "No response")); load(); } catch (e) { toast.error(safeText(e, "AI request failed")); } };

  const act = async (kind) => {
    if (!selected?.id) return;
    const base = `/ai/operator/actions/${selected.id}`;
    const legacy = `/ai/operator/approval-items/${selected.id}`;
    try {
      if (kind === "dismiss") await post(`${base}/dismiss`, {}).catch(() => post(`${legacy}/dismiss`, {}));
      else if (kind === "edit") await post(`${base}/edit`, { notes: "Owner edited draft" });
      else if (kind === "save-draft") await post(`${base}/save-draft`, {});
      else if (kind === "send-approved") await post(`${base}/send-approved`, {});
      else await post(`${base}/approve`, {}).catch(() => post(`${legacy}/approve`, {}));
      toast.success("Action logged");
      load();
    } catch (e) { toast.error(safeText(e, "Action failed")); }
  };

  const createItems = [["New job", "/jobs/new"], ["New quote", "/quotes/new"], ["New invoice", "/invoices/new"], ["Add client", "/clients/new"], ["Invite worker", "/team"]];
  const metricButtons = [
    ["Unassigned jobs", d.unassigned.length, Briefcase, "assign_worker"], ["Ready to invoice", d.ready.length, Receipt, "create_invoice_draft"], ["Quotes waiting", d.quotesWaiting.length, FileText, "quote_follow_up"], ["Open invoices", d.openInvoices.length, AlertTriangle, "invoice_reminder"], ["Crew active", d.crew, Users, "crew_workload"], ["Jobs today", d.todayJobs.length, Calendar, "all"],
  ];

  const actionLabel = selected?.action_type === "assign_worker" ? "Approve assignment" : selected?.action_type === "create_invoice_draft" ? "Create draft invoice" : selected?.action_type === "invoice_reminder" ? "Save reminder draft" : selected?.action_type === "quote_follow_up" ? "Save quote follow-up draft" : "Approve draft";

  if (state.loading) return <Layout><div className="min-h-screen bg-slate-100 p-4">Loading command centre…</div></Layout>;
  if (state.error) return <Layout><div className="min-h-screen bg-slate-100 p-4"><div className="bg-white rounded-xl p-4 border">{state.error}</div></div></Layout>;

  return <Layout><div className="min-h-screen bg-slate-100/95 p-3 md:p-5 space-y-4">
    <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-2">
      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">AI Command Centre</span>
      <h1 className="text-2xl font-bold">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}</h1>
      <p className="text-sm text-slate-600">{d.todayJobs.length} jobs today · {d.unassigned.length} unassigned · {d.openInvoices.length} invoices open · {d.crew} crew active</p>
      {isOwnerHub && <div className="flex flex-wrap gap-2"><button className="px-3 py-2 rounded-xl bg-blue-600 text-white" onClick={() => setActiveModal("create")}>Create</button><button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={runBrainScan}>Run brain scan</button><button className="px-3 py-2 rounded-xl bg-slate-200" onClick={() => setActiveModal("askAi")}>Ask AI</button></div>}
    </section>

    {isOwnerHub && <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-3"><h2 className="font-semibold">AI Brain Engine</h2><div className="text-sm text-slate-600">Status: <span className="font-semibold text-slate-900">{status.state}</span> · Pending approvals: {sortedApprovals.length} · Last scan: {status.last_scan_at ? new Date(status.last_scan_at).toLocaleString() : "Not yet"}</div><div className="text-xs text-slate-500">Checked: jobs, quotes, invoices, clients, crew</div><div className="flex flex-wrap gap-2 text-xs"><span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">Owner approval required</span><span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">Draft only</span><span className="px-2 py-1 rounded-full bg-green-100 text-green-700">No message sent</span></div><div className="flex gap-2 flex-wrap"><button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={runBrainScan}>Run brain scan</button><button className="px-3 py-2 rounded-lg bg-slate-200 text-sm" onClick={prepareToday}>Prepare today</button><button className="px-3 py-2 rounded-lg bg-slate-200 text-sm" onClick={() => setActiveModal("askAi")}>Ask AI</button></div></section>}

    <section className="grid grid-cols-2 lg:grid-cols-6 gap-2">{metricButtons.map(([label, count, Icon, filter]) => <button key={label} onClick={() => setQueueFilter(filter)} className="bg-white border rounded-xl p-3 text-left hover:border-blue-300"><div className="flex justify-between"><Icon className="h-4 w-4 text-blue-600"/><span className="text-[11px] text-slate-500">Filter</span></div><div className="text-xl font-bold">{count}</div><div className="text-xs text-slate-600">{label}</div></button>)}</section>

    <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-4 bg-white border rounded-2xl p-4"><h3 className="font-semibold">AI Approval Queue</h3><div className="mt-2 space-y-2 max-h-[65vh] overflow-auto">{filteredApprovals.map((a) => <button key={a.id} onClick={() => setSelectedActionId(a.id)} className={`w-full text-left border rounded-lg p-3 ${selected?.id === a.id ? "border-blue-600 bg-blue-50" : ""}`}><div className="flex justify-between"><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{safeText(a.action_type, "action")}</span><span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">{safeText(a.risk, "medium")}</span></div><div className="text-sm font-medium mt-1">{safeText(a.title, "Prepared action")}</div><div className="text-xs text-slate-600">{safeText(a.reason, "Needs review")}</div><div className="text-xs text-slate-500 mt-1">{safeText(a.draft_preview, "Prepared for approval")}</div></button>)}{filteredApprovals.length === 0 && <div className="text-sm text-slate-600">No actions for this filter.</div>}</div></div>
      <div className="xl:col-span-4 bg-white border rounded-2xl p-4 space-y-3"><h3 className="font-semibold">Selected Action Review</h3>{selected ? <><div className="text-lg font-semibold">{safeText(selected.title, "Prepared action")}</div><div className="text-sm text-slate-600">{safeText(selected.reason, "Review details")}</div><div className="text-sm"><span className="font-medium">AI recommendation:</span> {safeText(selected.recommendation || selected.draft_preview, "Proceed only after explicit approval.")}</div><pre className="text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-40">{JSON.stringify(selected.payload || selected, null, 2)}</pre><div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">Nothing happens until you approve.</div><div className="flex flex-wrap gap-2"><button className="px-3 py-2 rounded bg-slate-200 text-sm" onClick={() => act("edit")}>Edit draft</button><button className="px-3 py-2 rounded bg-slate-200 text-sm" onClick={() => act("dismiss")}>Dismiss</button><button className="px-3 py-2 rounded bg-slate-200 text-sm" onClick={() => { const type = safeText(selected.related?.type || "", ""); const id = selected.related?.id; if (type && id) navigate(`/${type}s/${id}`); else toast.info("Record not linked yet"); }}>Open full record</button><button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={() => act("approve")}>{actionLabel}</button>{["invoice_reminder", "quote_follow_up", "customer_update", "job_instruction"].includes(safeText(selected.action_type, "")) && <><button className="px-3 py-2 rounded bg-slate-900 text-white text-sm" onClick={() => act("save-draft")}>Save draft</button><button className="px-3 py-2 rounded bg-emerald-600 text-white text-sm" onClick={() => act("send-approved")}>Approve &amp; send</button></>}</div></> : <div className="text-sm text-slate-600">Select an AI action to review.</div>}</div>
      <div className="xl:col-span-4 bg-white border rounded-2xl p-4"><h3 className="font-semibold">Live Context</h3>{selected ? <div className="text-sm space-y-1 mt-2"><div><span className="font-medium">Related:</span> {safeText(selected.related?.type, "record")} {safeText(selected.related?.id, "")}</div><div><span className="font-medium">Client:</span> {safeText(selected.payload?.client_name || selected.client_name, "Not linked")}</div><div><span className="font-medium">Worker:</span> {safeText(selected.payload?.assigned_worker_name || selected.assigned_worker_name, "Unassigned")}</div><div><span className="font-medium">Due/status:</span> {safeText(selected.payload?.due_date || selected.payload?.status || selected.status, "n/a")}</div><div><span className="font-medium">Amount:</span> {safeText(selected.payload?.amount || selected.payload?.total, "n/a")}</div><div className="text-xs mt-2 p-2 rounded bg-amber-50 text-amber-700">Safety: no payroll, MYOB/accounting changes, charging, deletion, or legal/tax decisions run automatically.</div></div> : <div className="text-sm text-slate-600 mt-2">Select an AI action. Prepared drafts and approval controls appear here.</div>}</div>
    </section>

    <Modal open={!!activeModal} title="Command" onClose={() => setActiveModal("")}>{activeModal === "create" && <div className="space-y-2">{createItems.map(([label, path]) => <button key={label} className="w-full text-left px-3 py-2 rounded border hover:bg-slate-50" onClick={() => { setActiveModal(""); navigate(path); }}>{label}</button>)}</div>}{activeModal === "askAi" && <div className="space-y-2"><input className="w-full border rounded p-2 text-sm" placeholder="Ask AI Operator" value={askInput} onChange={(e) => setAskInput(e.target.value)} /><div className="flex gap-2 flex-wrap">{["What should I do next?", "Draft invoice reminders", "Assign unassigned jobs", "Follow up quotes", "Who is free today?"].map((s) => <button key={s} className="px-2 py-1 rounded bg-slate-100 text-xs" onClick={() => setAskInput(s)}>{s}</button>)}</div><button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={askAi}>Ask AI</button>{askAnswer && <div className="text-sm border rounded p-2 bg-slate-50 whitespace-pre-wrap">{askAnswer}</div>}</div>}</Modal>
  </div></Layout>;
}
