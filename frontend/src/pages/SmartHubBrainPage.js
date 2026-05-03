import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bot, Briefcase, CalendarClock, CheckCircle2, ClipboardList, FileText, PlusCircle, Receipt, Sparkles, Users, Wrench, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import JobCreateForm from "../components/forms/JobCreateForm";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import InvoiceCreateForm from "../components/forms/InvoiceCreateForm";
import ClientCreateForm from "../components/forms/ClientCreateForm";
import SmartHubDispatchPanel from "../components/SmartHubDispatchPanel";

const OWNER_ROLES = ["owner", "admin", "manager", "office_admin", "platform_owner"];
const APPROVAL_ACTION_TYPES = new Set(["assign_worker", "create_invoice_draft", "invoice_reminder", "quote_follow_up", "job_instruction", "customer_update", "client_cleanup", "schedule_conflict"]);

const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  const src = value?.data ?? value;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") {
    for (const key of keys) if (Array.isArray(src[key])) return src[key];
    if (Array.isArray(src.items)) return src.items;
    if (Array.isArray(src.data)) return src.data;
  }
  return [];
};

function SmartModal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true"><div className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[95vh] overflow-auto"><div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="p-4">{children}</div></div></div>;
}

export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canSeeOwnerControls = OWNER_ROLES.includes(role) && role !== "payroll";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [askQuery, setAskQuery] = useState("What should I do next?");
  const [askResponse, setAskResponse] = useState("");
  const [busy, setBusy] = useState({ run: false, prepare: false, ask: false, saving: false });

  const load = useCallback(async () => {
    setLoading(true);
    const safe = async (path) => { try { return await get(path); } catch { return []; } };
    const [jobs, clients, quotes, invoices, workers, approvals] = await Promise.all([
      safe("/jobs"), safe("/clients"), safe("/quotes"), safe("/invoices"), safe("/team/workers"), canSeeOwnerControls ? safe("/ai/operator/approval-items") : Promise.resolve([]),
    ]);
    setData({
      jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), quotes: listFrom(quotes, ["quotes"]), invoices: listFrom(invoices, ["invoices"]), workers: listFrom(workers, ["workers"]), approvals: listFrom(approvals, ["approval_items"]).filter((a) => APPROVAL_ACTION_TYPES.has(String(a.action_type || "").toLowerCase()) || !a.action_type),
    });
    setLoading(false);
  }, [canSeeOwnerControls]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const workers = useMemo(() => {
    const map = new Map();
    for (const worker of data.workers) {
      const key = String(worker.email || worker.phone || worker.name || worker.id || worker._id || "").toLowerCase();
      if (!key) continue;
      if (!map.has(key) || (map.get(key)?.active !== true && worker.active === true)) map.set(key, worker);
    }
    return [...map.values()];
  }, [data.workers]);

  const stats = useMemo(() => ({
    jobsToday: data.jobs.filter((j) => String(j.scheduled_date || j.date || "").slice(0, 10) === today).length,
    unassigned: data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).length,
    activeJobs: data.jobs.filter((j) => ["assigned", "active", "in_progress"].includes(String(j.status || "").toLowerCase())).length,
    quotesWaiting: data.quotes.filter((q) => ["sent", "pending", "draft"].includes(String(q.status || "").toLowerCase())).length,
    openInvoices: data.invoices.filter((i) => ["open", "overdue", "draft", "sent"].includes(String(i.status || "").toLowerCase())).length,
    readyToInvoice: data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").length,
    overdueInvoices: data.invoices.filter((i) => String(i.status || "").toLowerCase() === "overdue").length,
    crewActive: workers.filter((w) => ["active", "on_site", "busy"].includes(String(w.status || "").toLowerCase())).length,
  }), [data, today, workers]);

  const aiPlan = [
    stats.unassigned ? { label: `Assign ${stats.unassigned} unassigned jobs`, reason: "Prevent schedule delays.", action: "assign_worker", button: "Assign", icon: ClipboardList, chip: "In progress" } : null,
    stats.readyToInvoice ? { label: `Create ${stats.readyToInvoice} draft invoices`, reason: "Completed jobs should convert to invoices.", action: "invoice_draft", button: "Draft invoices", icon: Receipt, chip: "Available" } : null,
    stats.quotesWaiting ? { label: `Follow up ${stats.quotesWaiting} quotes`, reason: "Increase conversion.", action: "quote_followup", button: "Review quotes", icon: FileText, chip: "Needs review" } : null,
    stats.overdueInvoices ? { label: `Chase ${stats.overdueInvoices} overdue invoices`, reason: "Reduce late receivables.", action: "invoice_reminder", button: "Draft invoices", icon: AlertTriangle, chip: "Warning" } : null,
    workers.length ? { label: "Check crew workload", reason: "Balance dispatch before afternoon peak.", action: "crew", button: "Check crew", icon: Users, chip: "Assigned" } : null,
  ].filter(Boolean).slice(0, 5);

  const priority = useMemo(() => {
    const items = [];
    data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).slice(0, 3).forEach((j) => items.push({ title: j.title || "Unassigned job", reason: "Needs worker assignment", chip: "unassigned", action: "assign_worker", button: "Assign" }));
    data.quotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())).slice(0, 1).forEach((q) => items.push({ title: q.title || "Quote waiting", reason: "Awaiting customer response", chip: "quote", action: "quote_followup", button: "Review quotes" }));
    data.invoices.filter((i) => ["open", "overdue"].includes(String(i.status || "").toLowerCase())).slice(0, 1).forEach((i) => items.push({ title: i.invoice_number || "Invoice follow-up", reason: "Payment still outstanding", chip: String(i.status || "open"), action: "invoice_reminder", button: "Draft invoices" }));
    data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").slice(0, 1).forEach((j) => items.push({ title: j.title || "Ready to invoice", reason: "Completed job awaiting invoice", chip: "completed", action: "invoice_draft", button: "Draft invoices" }));
    return items.slice(0, 6);
  }, [data]);

  const runDailyCheck = async () => { setBusy((s) => ({ ...s, run: true })); try { await post("/ai/operator/run-daily-check", {}); } catch {} await load(); setBusy((s) => ({ ...s, run: false })); };
  const prepareToday = async () => { setBusy((s) => ({ ...s, prepare: true })); try { await post("/ai/operator/prepare-today", {}); } catch {} await load(); setBusy((s) => ({ ...s, prepare: false })); setModal("prepare"); };

  const askAi = async () => {
    setBusy((s) => ({ ...s, ask: true }));
    try {
      const res = await post("/ai/operator/ask", { question: askQuery });
      setAskResponse(res?.answer || res?.data?.answer || "AI response received.");
    } catch {
      setAskResponse(`Suggested next steps: Assign ${stats.unassigned} unassigned jobs, follow up ${stats.quotesWaiting} quotes, and chase ${stats.overdueInvoices} overdue invoices.`);
    }
    setBusy((s) => ({ ...s, ask: false }));
  };

  const renderModalBody = () => {
    if (modal === "job") return <JobCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create job" />;
    if (modal === "quote") return <QuoteCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create quote" />;
    if (modal === "invoice") return <InvoiceCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create invoice" />;
    if (modal === "client") return <ClientCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Add client" />;
    if (["dispatch", "assign_worker"].includes(modal)) return <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} />;
    if (modal === "prepare") return <div className="space-y-2 text-sm">{aiPlan.map((p) => <div key={p.label} className="rounded-lg border p-2">{p.label}</div>)}</div>;
    if (modal === "ask") return <div className="space-y-3"><div className="flex flex-wrap gap-2">{["What should I do next?", "Jobs needing attention", "Invoice follow-up", "Quote follow-up", "Crew workload"].map((chip) => <button key={chip} onClick={() => setAskQuery(chip)} className="text-xs rounded-full border px-3 py-1">{chip}</button>)}</div><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-lg border p-2" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm">{busy.ask ? "Generating…" : "Generate"}</button><div className="rounded-lg border p-3 text-sm min-h-16">{askResponse || "Response will appear here."}</div></div>;
    return <div className="text-sm text-slate-600">Action centre ready.</div>;
  };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  const metricCards = [["Jobs today", stats.jobsToday, "Focus run sheet", () => document.getElementById("run-sheet")?.scrollIntoView({ behavior: "smooth" }), CalendarClock], ["Unassigned jobs", stats.unassigned, "Assign worker", () => setModal("assign_worker"), ClipboardList], ["Active jobs", stats.activeJobs, "Open jobs", () => navigate("/jobs"), Briefcase], ["Quotes waiting", stats.quotesWaiting, "Quote follow-up", () => setModal("quote_followup"), FileText], ["Open invoices", stats.openInvoices, "Invoice follow-up", () => setModal("invoice_reminder"), Receipt], ["Ready to invoice", stats.readyToInvoice, "Create drafts", () => setModal("invoice_draft"), PlusCircle], ["Overdue invoices", stats.overdueInvoices, "Send reminders", () => setModal("invoice_reminder"), AlertTriangle], ["Crew active", stats.crewActive, "Focus crew panel", () => document.getElementById("crew-panel")?.scrollIntoView({ behavior: "smooth" }), Users]];

  return <Layout><div className="min-h-screen p-3 sm:p-5" style={{ background: "radial-gradient(circle at top left, rgba(21,94,239,0.10), transparent 30%), radial-gradient(circle at top right, rgba(109,93,246,0.08), transparent 26%), linear-gradient(rgba(18,185,129,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(21,94,239,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(18,185,129,0.02) 0, rgba(18,185,129,0.02) 1px, transparent 1px, transparent 100%), #F4F7FB", backgroundSize: "auto,auto,28px 28px,28px 28px,56px 56px,6px 6px,auto" }}><div className="mx-auto max-w-7xl space-y-4 relative z-10">
    <section className="bg-white/95 rounded-2xl border border-[#DCE6F3] p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAF1FF] text-[#155EEF] border border-[#BFD3FF] inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#12B981]" />AI Command Centre</span>
          <h1 className="mt-2 text-2xl font-semibold text-[#0F172A]">Welcome back, {user?.name || "Random az"}</h1>
          <p className="text-sm text-[#64748B]">{now.toLocaleDateString()} • Status: Live sync active</p>
          <p className="text-sm text-[#334155] mt-1">Live operations: {stats.jobsToday} jobs, {stats.unassigned} unassigned, {stats.openInvoices} open invoices, {stats.crewActive} crew active.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">{[["New job", "job", true], ["New quote", "quote"], ["New invoice", "invoice"], ["Add client", "client"], ["Dispatch board", "dispatch"]].map(([label, key, primary]) => <button key={key} onClick={() => setModal(key)} className={primary ? "rounded-full bg-[#155EEF] hover:bg-[#0F46C8] text-white px-4 py-2.5 text-sm font-medium" : "rounded-full border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium"}>{label}</button>)}
          <button onClick={runDailyCheck} className="rounded-full px-4 py-2.5 text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #155EEF 0%, #6D5DF6 55%, #0EA5E9 100%)" }} disabled={busy.run}>{busy.run ? "Checking…" : "Run AI check"}</button>
        </div>
      </div>
    </section>

    {canSeeOwnerControls ? <section className="bg-white rounded-2xl border border-[#BFD3FF] p-4 sm:p-5 shadow-sm relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#155EEF] via-[#6D5DF6] to-[#0EA5E9]" />
      <div className="flex flex-wrap justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-semibold flex items-center gap-2 text-[#0F172A]"><span className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, rgba(21,94,239,0.15) 0%, rgba(109,93,246,0.12) 55%, rgba(14,165,233,0.15) 100%)" }}><Bot className="h-4 w-4 text-[#155EEF]" /></span>AI Operator</h2>
          <p className="text-sm text-[#334155]">Live business scan. I prepare the admin. You approve the next move.</p>
          <div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-[#DCFCE7] text-[#16A34A] px-2.5 py-1 font-medium inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#12B981]" />{data.approvals.length > 2 ? "Needs attention" : data.approvals.length ? "Live" : "Ready"}</span><span className="text-[#64748B]">Pending approvals: {data.approvals.length}</span></div>
        </div>
        <div className="flex flex-wrap gap-2 items-start"><button onClick={runDailyCheck} className="rounded-full bg-[#155EEF] hover:bg-[#0F46C8] text-white px-3.5 py-2 text-xs font-medium">Run daily check</button><button onClick={() => setModal("approvals")} className="rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#334155]">Review approvals</button><button onClick={prepareToday} disabled={busy.prepare} className="rounded-full border border-[#BFD3FF] bg-[#EAF1FF] hover:bg-[#dfe9ff] px-3.5 py-2 text-xs font-medium text-[#155EEF]">{busy.prepare ? "Preparing…" : "Prepare today"}</button><button onClick={() => setModal("ask")} className="rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#334155]">Ask AI</button></div>
      </div>
      <div className="mt-3">{data.approvals.length ? <div className="space-y-2">{data.approvals.slice(0, 3).map((a, i) => <div key={a.id || i} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-sm font-semibold text-[#0F172A]">{a.title || "Approval needed"}</p><p className="text-xs text-[#64748B] mt-1">{a.reason || "Prepared by AI"}</p></div>)}</div> : <p className="text-sm text-[#64748B] rounded-xl bg-[#EEF2FF] px-3 py-2">No approvals pending. Run daily check to prepare actions.</p>}</div>
    </section> : null}

    <section className="bg-white rounded-2xl border border-[#DCE6F3] p-4 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#6D5DF6]" /><h3 className="font-semibold text-[#0F172A]">Today’s AI Plan</h3></div><p className="text-xs text-[#64748B] mt-1">Priority actions prepared for this shift.</p><div className="mt-3 grid gap-2">{aiPlan.length ? aiPlan.map((item) => <div key={item.label} className="rounded-xl border border-[#DCE6F3] bg-[#F8FAFC] p-3 flex items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-lg p-2 bg-[#EAF1FF]"><item.icon className="h-4 w-4 text-[#155EEF]" /></span><div><p className="text-sm font-medium text-[#0F172A]">{item.label}</p><p className="text-xs text-[#64748B]">{item.reason}</p></div></div><div className="flex items-center gap-2"><span className="text-[10px] rounded-full bg-[#ECFEF4] px-2 py-1 text-[#047857]">{item.chip}</span><button className="rounded-full bg-[#155EEF] hover:bg-[#0F46C8] text-white px-3 py-1.5 text-xs" onClick={() => setModal(item.action)}>{item.button}</button></div></div>) : <p className="text-sm text-[#64748B]">No priority actions right now.</p>}</div></section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metricCards.map(([label, count, hint, action, Icon]) => <button key={label} onClick={action} className="bg-white rounded-2xl border border-[#DCE6F3] p-3.5 shadow-sm text-left hover:-translate-y-0.5 hover:shadow-md transition"><div className="h-0.5 w-full rounded bg-gradient-to-r from-[#155EEF] via-[#0EA5E9] to-transparent mb-2" /><div className="flex justify-between items-start"><p className="text-2xl font-semibold text-[#0F172A]">{count}</p><span className="h-8 w-8 rounded-full bg-[#EAF1FF] inline-flex items-center justify-center"><Icon className="h-4 w-4 text-[#155EEF]" /></span></div><p className="text-sm font-medium mt-2 text-[#334155]">{label}</p><p className="text-xs text-[#64748B] mt-0.5">{hint}</p></button>)}</section>

    <section className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"><div className="flex justify-between"><h3 className="font-semibold text-[#0F172A]">Priority Queue</h3>{priority.length >= 6 ? <button className="text-sm text-[#155EEF]">View all actions</button> : null}</div><div className="mt-3 space-y-2">{priority.length ? priority.map((item, i) => <div key={`${item.title}-${i}`} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex justify-between gap-2"><div><p className="text-sm font-medium text-[#0F172A]">{item.title}</p><p className="text-xs text-[#64748B]">{item.reason}</p></div><div className="flex items-center gap-2"><span className="text-[10px] rounded-full bg-[#F1F5F9] px-2 py-1 text-[#475569]">{item.chip}</span><button className="rounded-full bg-[#155EEF] text-white px-3 py-1.5 text-xs" onClick={() => setModal(item.action)}>{item.button}</button></div></div>) : <p className="text-sm text-[#64748B]">No urgent items right now.</p>}</div></div>

      <div className="space-y-4">
        <div id="run-sheet" className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"><h3 className="font-semibold text-[#0F172A]">Today’s Run Sheet</h3>{stats.jobsToday ? <p className="text-sm text-[#64748B] mt-2">{stats.jobsToday} jobs scheduled today. Open Jobs to review route and timings.</p> : <div className="mt-3 rounded-xl border border-dashed border-[#BFD3FF] bg-[#F8FAFC] p-4"><p className="text-sm text-[#64748B]">No jobs in today’s run sheet.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setModal("job")} className="rounded-full bg-[#155EEF] text-white px-3 py-1.5 text-xs">New job</button><button onClick={() => setModal("dispatch")} className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs">Open dispatch</button></div></div>}</div>
        <div id="crew-panel" className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold text-[#0F172A]">Crew + Dispatch</h3><button onClick={() => setModal("assign_worker")} className="rounded-full bg-[#155EEF] text-white px-3 py-1.5 text-xs">Assign now</button></div><p className="text-xs text-[#64748B] mt-1">Unassigned jobs: {stats.unassigned}</p><div className="mt-3 space-y-2">{workers.slice(0, 5).map((w, i) => <div key={w.id || w._id || i} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 flex justify-between"><p className="text-sm text-[#334155]">{w.name || w.email || "Crew member"}</p><span className="text-[10px] rounded-full px-2 py-1 bg-[#EAF1FF] text-[#155EEF]">{w.status || "available"}</span></div>)}{!workers.length ? <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B]">No crew profiles yet.</div> : null}</div></div>
      </div>
    </section>

  </div></div><SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{renderModalBody()}</SmartModal></Layout>;
}
