import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const nav = [
  ["Command Board", "/dashboard", "CB"],
  ["Jobs", "/jobs", "JB"],
  ["Dispatch", "/dispatch", "DP"],
  ["Crew Map", "/crew-map", "MP"],
  ["Clients", "/clients", "CL"],
  ["Quotes", "/quotes", "QT"],
  ["Invoices", "/invoices", "IV"],
  ["Team", "/team", "TM"],
  ["Plans", "/plans", "PL"],
  ["Settings", "/settings", "ST"],
  ["Support", "/support", "?"],
];

const emptyAction = {
  title: "Run AI scan to prepare real approvals",
  type: "scan_needed",
  summary: "No live approval slips are waiting yet. Run a scan so Churvox can prepare actions from real jobs, quotes and invoices.",
  form: { next_step: "Run AI scan", result: "Real executable slips will appear here" },
  fields: [["next_step", "Next step"], ["result", "Result"]],
  evidence: ["Real slips execute backend actions", "Owner approval required", "Emails and assignments are logged"],
};

function cleanType(row) {
  return String(row?.action_type || row?.type || "prepared_action").toLowerCase().replaceAll("-", "_");
}
function idOf(row) { return String(row?.id || row?._id || row?.action_id || ""); }
function payloadOf(row) { return row?.payload || row?.draft_payload || row?.proposed_changes || {}; }
function first(...values) { return values.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || ""; }
function labelFor(type) {
  if (type === "assign_worker") return "Worker assignment";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Invoice draft";
  if (["send_invoice", "invoice_send"].includes(type)) return "Send invoice";
  if (type === "invoice_reminder") return "Payment reminder";
  if (["quote_follow_up", "quote_followup"].includes(type)) return "Quote follow-up";
  if (["job_review", "approve_job_review"].includes(type)) return "Job review";
  if (type.includes("customer")) return "Customer update";
  return "Prepared action";
}
function approveLabel(type) {
  if (type === "assign_worker") return "Approve assignment";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Create draft invoice";
  if (["send_invoice", "invoice_send"].includes(type)) return "Email invoice";
  if (type === "invoice_reminder") return "Send reminder";
  if (["quote_follow_up", "quote_followup"].includes(type)) return "Send follow-up";
  if (["job_review", "approve_job_review"].includes(type)) return "Approve job review";
  return "Approve and execute";
}
function hrefFor(type) {
  if (type.includes("quote")) return "/quotes";
  if (type.includes("invoice")) return "/invoices";
  if (type.includes("worker") || type.includes("assign")) return "/dispatch";
  if (type.includes("job")) return "/jobs";
  return "/dashboard";
}
function fieldsFor(type) {
  if (type === "assign_worker") return [["job_id", "Job ID"], ["worker_id", "Worker ID"], ["recommended_worker_id", "Recommended worker"], ["message", "Worker note", "textarea"]];
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return [["job_id", "Completed job ID"], ["client_id", "Client ID"], ["customer_email", "Customer email"], ["subtotal", "Subtotal"], ["gst_rate", "GST rate"], ["send_after_approval", "Send after approval"], ["description", "Invoice description", "textarea"]];
  if (["send_invoice", "invoice_send"].includes(type)) return [["invoice_id", "Invoice ID"], ["customer_email", "Customer email"], ["message", "Email message", "textarea"]];
  if (type === "invoice_reminder") return [["invoice_id", "Invoice ID"], ["customer_email", "Customer email"], ["message", "Reminder message", "textarea"]];
  if (["quote_follow_up", "quote_followup"].includes(type)) return [["quote_id", "Quote ID"], ["customer_email", "Customer email"], ["message", "Follow-up message", "textarea"]];
  if (["job_review", "approve_job_review"].includes(type)) return [["job_id", "Job ID"], ["timesheet_status", "Timesheet status"], ["description", "Invoice suggestion", "textarea"]];
  return [["related_entity_id", "Record ID"], ["message", "Prepared message", "textarea"]];
}
function toAction(row) {
  const type = cleanType(row);
  const p = payloadOf(row);
  const related = String(row?.related_entity_id || row?.related_id || p?.job_id || p?.invoice_id || p?.quote_id || "");
  return {
    id: idOf(row), raw: row, type,
    badge: labelFor(type), title: row?.title || labelFor(type), summary: row?.summary || row?.recommendation || "Prepared by Churvox for owner approval.",
    approveText: approveLabel(type), href: hrefFor(type), fields: fieldsFor(type),
    form: {
      ...p,
      related_entity_id: related,
      job_id: first(p.job_id, row?.job_id, (type.includes("job") || type.includes("invoice_draft")) ? related : ""),
      invoice_id: first(p.invoice_id, row?.invoice_id, (type.includes("invoice") && !type.includes("draft")) ? related : ""),
      quote_id: first(p.quote_id, row?.quote_id, type.includes("quote") ? related : ""),
      customer_email: first(p.customer_email, p.email, row?.customer_email),
      message: first(p.message, p.draft_message, row?.generated_message),
      description: first(p.description, p.invoice_description, row?.generated_message, row?.summary),
      subtotal: first(p.subtotal, p.amount, p.total),
      gst_rate: first(p.gst_rate, "15"),
    },
    evidence: [row?.reason || "Built from live business data", row?.recommendation || "Owner approval required", "Execution is logged"].filter(Boolean),
  };
}

function Sidebar() {
  const { pathname } = useLocation();
  return <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
    <div className="mb-6 flex items-center gap-3 px-1"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div><div><div className="text-sm font-black">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div></div>
    <nav className="space-y-1">{nav.map(([label, href, icon]) => { const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)); return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>{label}</Link>; })}</nav>
  </aside>;
}

function Field({ field, value, onChange }) {
  const [name, label, type] = field;
  const cls = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300";
  return <label><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>{type === "textarea" ? <textarea rows={5} value={value || ""} onChange={(e) => onChange(name, e.target.value)} className={`${cls} leading-6`} /> : <input value={value || ""} onChange={(e) => onChange(name, e.target.value)} className={cls} />}</label>;
}

function Slip({ action, onClose, onDone, runScan }) {
  const { post } = useApi();
  const [form, setForm] = React.useState(action?.form || {});
  const [title, setTitle] = React.useState(action?.title || "");
  const [summary, setSummary] = React.useState(action?.summary || "");
  const [message, setMessage] = React.useState(first(action?.form?.message, action?.form?.description, action?.raw?.generated_message, action?.summary));
  const [ownerNote, setOwnerNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setForm(action?.form || {}); setTitle(action?.title || ""); setSummary(action?.summary || ""); setMessage(first(action?.form?.message, action?.form?.description, action?.raw?.generated_message, action?.summary)); setOwnerNote(""); }, [action]);
  if (!action) return null;
  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const execute = async () => {
    if (!action.id) { await runScan(); return; }
    setBusy(true);
    const payload = { ...(action.raw?.payload || {}), ...(action.raw?.draft_payload || {}), ...form, title, summary, owner_note: ownerNote, message, draft_message: message, description: form.description || message, send_after_approval: String(form.send_after_approval || form.sendMode || "").toLowerCase().includes("send") };
    const res = await post(`/ai/operator/actions/${action.id}/execute`, payload);
    setBusy(false);
    if (res?.success) { toast.success("Approved — Churvox executed the action"); onDone(action.id); onClose(); }
    else toast.error(res?.error || "Could not execute approval");
  };
  return <div className="fixed inset-0 z-[2147483647] bg-[#f5f7f1] text-slate-950"><div className="flex h-full flex-col overflow-hidden"><header className="border-b border-slate-800 bg-[#0f1722] px-4 py-4 text-white md:px-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Real approval form</div><h2 className="mt-2 text-2xl font-black tracking-[-0.06em] md:text-4xl">{action.badge}</h2><p className="mt-1 max-w-4xl text-sm font-semibold text-slate-300">Edit the filled form. Approval runs the backend action and logs the result.</p></div><button onClick={onClose} className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">Close</button></div></header><main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-7"><section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-4"><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(action.fields || []).map((f) => <Field key={f[0]} field={f} value={form[f[0]]} onChange={update} />)}</div></section><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Action title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-black text-slate-950" /><label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">What Churvox prepared</label><textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800" /><label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Message / invoice wording</label><textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-2 w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950" /></section><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Evidence</div><div className="mt-3 space-y-2">{(action.evidence || []).map((e) => <div key={e} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">✓ {e}</div>)}</div></section></div><aside className="space-y-4"><section className="rounded-[28px] border border-slate-900 bg-[#143658] p-5 text-white shadow-lg"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner approval executes</div><p className="mt-3 text-sm font-semibold leading-6 text-slate-200">This button creates invoices, sends emails, assigns workers, sends reminders or approves job review depending on the slip type.</p><button onClick={execute} disabled={busy} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Executing…" : action.approveText || "Approve"}</button><Link to={action.href || "/dashboard"} className="mt-3 inline-flex w-full justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Open record</Link></section><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Owner note</div><textarea rows={6} value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800" /></section></aside></section></main></div></div>;
}

export default function CommandDeskRealPage() {
  const { get, post } = useApi();
  const [actions, setActions] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const load = React.useCallback(async () => { setLoading(true); const res = await get("/ai/operator/approval-items"); const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : []; setActions(rows.filter((r) => !["completed", "rejected", "dismissed"].includes(String(r?.status || "").toLowerCase())).map(toAction)); setLoading(false); }, [get]);
  React.useEffect(() => { load(); }, [load]);
  const runScan = async () => { setScanning(true); const res = await post("/ai/operator/scan", {}); if (res?.success) { toast.success("AI scan complete"); await load(); } else toast.error(res?.error || "AI scan failed"); setScanning(false); };
  const queue = actions.length ? actions : [emptyAction];
  const done = (id) => setActions((prev) => prev.filter((a) => a.id !== id));
  return <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950"><div className="flex min-h-screen"><Sidebar /><section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8"><header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Command Board</div><div className="text-sm font-bold text-slate-500">Real owner approvals. Churvox prepares, you approve, backend executes.</div></div><button onClick={runScan} disabled={scanning} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-60">{scanning ? "Scanning…" : "Run AI scan"}</button></header><section className="grid gap-5 xl:grid-cols-[1fr_420px]"><div className="rounded-[30px] border border-slate-900 bg-slate-950 p-7 text-white shadow-xl"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Real AI Operator</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] md:text-6xl">Churvox prepares. You approve. It executes.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Open a prepared slip, edit the form, approve it, and Churvox runs the real action.</p><button onClick={() => setSelected(queue[0])} className="mt-6 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950">Open next approval</button></div><aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Owner queue</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">Live executable slips</h2></div><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{loading ? "…" : actions.length}</span></div><div className="mt-5 space-y-3">{queue.slice(0, 6).map((item) => <button key={item.id || item.title} onClick={() => setSelected(item)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-200 hover:bg-blue-50"><div className="text-sm font-black text-slate-950">{item.badge || item.type}</div><div className="mt-1 text-xs font-bold text-slate-500">{item.id ? "Executes after approval" : "Run scan for real actions"}</div></button>)}</div></aside></section><section className="mt-5 grid gap-4 md:grid-cols-4"><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Live approvals</span><strong className="mt-4 block text-3xl font-black text-slate-950">{actions.length}</strong><p className="text-xs font-bold text-slate-500">Ready to execute</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Safety</span><strong className="mt-4 block text-3xl font-black text-slate-950">Owner</strong><p className="text-xs font-bold text-slate-500">Approval required</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Actions</span><strong className="mt-4 block text-3xl font-black text-slate-950">Real</strong><p className="text-xs font-bold text-slate-500">Backend wired</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">Emails</span><strong className="mt-4 block text-3xl font-black text-slate-950">Postmark</strong><p className="text-xs font-bold text-slate-500">Send after approve</p></div></section><section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-3xl font-black tracking-[-0.06em] text-slate-950">AI-prepared executable forms</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{queue.map((a) => <button key={a.id || a.title} onClick={() => setSelected(a)} className="rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-200"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">{a.badge}</div><div className="mt-1 text-lg font-black text-slate-950">{a.title}</div><p className="mt-2 text-sm font-semibold text-slate-600">{a.summary}</p><div className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Open prepared form</div></button>)}</div></section></section></div>{selected ? <Slip action={selected} onClose={() => setSelected(null)} onDone={done} runScan={runScan} /> : null}</main>;
}
