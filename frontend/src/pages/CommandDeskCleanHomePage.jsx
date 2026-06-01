import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"]] },
  { title: "Admin", items: [["Team", "/team", "TM"], ["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const stats = [
  ["Needs approval", "7", "Invoices, quotes and dispatch decisions", "amber"],
  ["Jobs today", "18", "Scheduled, running or ready to review", "blue"],
  ["Ready money", "$4.8k", "Work ready to invoice or chase", "green"],
  ["Crew risks", "3", "Conflicts, gaps or overloaded workers", "slate"],
];

const approvals = [
  {
    badge: "Invoice ready",
    kind: "invoice",
    type: "Invoice draft",
    title: "Create invoice from completed job",
    summary: "Job completed, photos uploaded, time checked and invoice wording prepared.",
    href: "/invoices/new",
    primary: "Create draft invoice",
    formTitle: "Invoice form prepared by Churvox",
    formIntro: "Review the completed job, edit the invoice wording and approve the draft invoice from this slip.",
    preparedText: "Service work completed for Rental owner at 14 King Street. Worker notes and completion photos are attached. Total tracked time was 2h 10m. Draft invoice is ready for owner review before sending.",
    form: {
      client: "Rental owner",
      job: "Rental cleanup",
      worker: "Mike",
      invoiceNumber: "Draft next available",
      pricingType: "Fixed price",
      amount: "320.00",
      gst: "15% GST",
      dueDate: "7 days from approval",
      status: "Draft only",
      timesheet: "2h 10m tracked · pending owner review",
      sendMode: "Create draft, do not send",
    },
    fields: [
      ["client", "Client"], ["job", "Completed job"], ["worker", "Worker"], ["invoiceNumber", "Invoice no."],
      ["pricingType", "Pricing type"], ["amount", "Amount"], ["gst", "GST"], ["dueDate", "Due date"],
      ["timesheet", "Timesheet"], ["sendMode", "Send rule"],
    ],
    evidence: ["Job marked completed", "Photos attached", "Worker note saved", "Time entry ready for timesheet", "Invoice description drafted"],
  },
  {
    badge: "Dispatch ready",
    kind: "assignment",
    type: "Worker assignment",
    title: "Assign best worker",
    summary: "Churvox checked availability, area and workload before recommending a worker.",
    href: "/dispatch",
    primary: "Approve assignment",
    formTitle: "Worker assignment form prepared by Churvox",
    formIntro: "The job, worker suggestion, schedule check and worker note are already filled. Change anything before approving.",
    preparedText: "You have been assigned Hedge trim for Greenlane client. Please review the job notes, confirm access details, then start the job when you arrive on site.",
    form: {
      client: "Greenlane client",
      job: "Hedge trim",
      address: "23 Greenlane Road",
      recommendedWorker: "Tane",
      backupWorker: "Jo",
      schedule: "Today 3:00 PM",
      conflictCheck: "No obvious clash found",
      reason: "Closest worker with lighter workload and hedge trim experience",
      status: "Ready to assign",
      ownerApproval: "Required before worker is notified",
    },
    fields: [
      ["client", "Client"], ["job", "Job"], ["address", "Address"], ["recommendedWorker", "Recommended worker"],
      ["backupWorker", "Backup worker"], ["schedule", "Schedule"], ["conflictCheck", "Conflict check"],
      ["reason", "Why this worker", "textarea"], ["ownerApproval", "Approval rule"],
    ],
    evidence: ["Worker available", "Area match looks good", "No obvious schedule conflict", "Workload checked", "Worker message drafted"],
  },
  {
    badge: "Quote follow-up",
    kind: "quote_followup",
    type: "Customer message",
    title: "Send customer nudge",
    summary: "A quiet quote needs follow-up. Message is drafted; owner approves before it sends.",
    href: "/quotes",
    primary: "Approve follow-up",
    formTitle: "Quote follow-up form prepared by Churvox",
    formIntro: "The quote, customer, amount and follow-up message are ready. Edit the wording before sending.",
    preparedText: "Hi Sarah, just checking in on the quote we prepared for the hedge trim. Happy to answer any questions or adjust the details if needed.",
    form: {
      client: "Sarah Thompson",
      quote: "QT-1042",
      job: "Hedge trim quote",
      amount: "$540.00",
      lastSent: "5 days ago",
      channel: "Email first",
      tone: "Friendly follow-up",
      sendRule: "Owner approve before sending",
      status: "Waiting for approval",
    },
    fields: [
      ["client", "Client"], ["quote", "Quote"], ["job", "Job / scope"], ["amount", "Quote amount"],
      ["lastSent", "Last sent"], ["channel", "Channel"], ["tone", "Tone"], ["sendRule", "Send rule"],
    ],
    evidence: ["Quote has not been answered", "Follow-up message prepared", "Customer wording editable", "No message sends without owner approval"],
  },
  {
    badge: "Payment chase",
    kind: "payment_reminder",
    type: "Payment reminder",
    title: "Overdue invoice reminder",
    summary: "A firm but polite reminder is ready so cash does not sit forgotten.",
    href: "/invoices",
    primary: "Approve reminder",
    formTitle: "Payment reminder form prepared by Churvox",
    formIntro: "The overdue invoice, customer and reminder message are ready. Edit it before approving.",
    preparedText: "Hi, friendly reminder this invoice is still open. Please let us know if you need another copy or have any questions. Thanks.",
    form: {
      client: "Invoice customer",
      invoice: "INV-1088",
      job: "Garden maintenance",
      amountDue: "$780.00",
      daysOverdue: "9 days overdue",
      channel: "Email reminder",
      tone: "Polite but clear",
      sendRule: "Owner approve before sending",
      status: "Ready to approve",
    },
    fields: [
      ["client", "Client"], ["invoice", "Invoice"], ["job", "Job"], ["amountDue", "Amount due"],
      ["daysOverdue", "Overdue"], ["channel", "Channel"], ["tone", "Tone"], ["sendRule", "Send rule"],
    ],
    evidence: ["Invoice is overdue", "Reminder drafted", "Amount checked", "Message can be edited", "No reminder sends without approval"],
  },
  {
    badge: "Job review",
    kind: "job_review",
    type: "Completed job review",
    title: "Approve completed job and timesheet",
    summary: "Worker finished the job, time was captured, photos are attached and the job is ready for owner review.",
    href: "/jobs",
    primary: "Approve job review",
    formTitle: "Job completion form prepared by Churvox",
    formIntro: "Review the worker note, photos, time entry and invoice suggestion before approving the job.",
    preparedText: "Worker completed the job, uploaded photos and recorded time. Suggested invoice wording is ready once owner approves the completion.",
    form: {
      client: "Rental owner",
      job: "Rental cleanup",
      worker: "Mike",
      started: "8:42 AM",
      finished: "10:52 AM",
      netTime: "2h 10m",
      pauseTime: "0m paused",
      mapStatus: "Start location captured",
      timesheetStatus: "Pending owner approval",
      nextAction: "Approve job, then create invoice draft",
    },
    fields: [
      ["client", "Client"], ["job", "Job"], ["worker", "Worker"], ["started", "Started"],
      ["finished", "Finished"], ["netTime", "Net worked time"], ["pauseTime", "Paused time"],
      ["mapStatus", "Location proof"], ["timesheetStatus", "Timesheet"], ["nextAction", "Next action", "textarea"],
    ],
    evidence: ["Worker tapped Finish Job", "Timesheet entry created", "Photos attached", "Owner can edit before approval", "Invoice wording suggested"],
  },
];

const jobs = [["8:30", "Lawn service", "In progress"], ["10:00", "Rental cleanup", "Assigned"], ["1:30", "Quote visit", "Needs worker"], ["3:00", "Hedge trim", "Ready"]];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/crew-map") return pathname === "/crew-map" || pathname === "/dispatch/map";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Stat({ item }) {
  const colour = { amber: "bg-amber-50 text-amber-800 border-amber-200", blue: "bg-blue-50 text-blue-800 border-blue-200", green: "bg-emerald-50 text-emerald-800 border-emerald-200", slate: "bg-slate-100 text-slate-800 border-slate-200" }[item[3]];
  return <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${colour}`}>{item[0]}</span><strong className="mt-4 block text-3xl font-black tracking-[-0.06em] text-slate-950">{item[1]}</strong><p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item[2]}</p></article>;
}

function Approval({ item, onOpen }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">{item.badge}</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3></div><span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">FORM</span></div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex gap-3"><button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review</button><button type="button" onClick={() => onOpen(item)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open prepared form</button></div>
    </article>
  );
}

function SlipField({ label, name, type, value, onChange }) {
  const common = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300";
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {type === "textarea" ? <textarea value={value || ""} onChange={(e) => onChange(name, e.target.value)} rows={4} className={`${common} leading-6`} /> : <input value={value || ""} onChange={(e) => onChange(name, e.target.value)} className={common} />}
    </label>
  );
}

function WorkSlip({ active, onClose }) {
  const [draft, setDraft] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    setDraft({
      title: active.title || "",
      summary: active.summary || "",
      preparedText: active.preparedText || "",
      ownerNote: "",
      form: { ...(active.form || {}) },
      evidence: [...(active.evidence || [])],
    });
    setSaved(false);
  }, [active]);

  if (!active || !draft) return null;

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
  const updateForm = (field, value) => setDraft((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }));
  const updateEvidence = (index, value) => setDraft((prev) => ({ ...prev, evidence: prev.evidence.map((row, i) => (i === index ? value : row)) }));
  const save = () => setSaved(true);

  return (
    <div className="fixed inset-0 z-[2147483647] bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-800 bg-[#0f1722] px-4 py-4 text-white md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Prepared action form</div><h2 className="mt-2 text-2xl font-black tracking-[-0.06em] md:text-4xl">{active.formTitle}</h2><p className="mt-1 max-w-4xl text-sm font-semibold text-slate-300">{active.formIntro}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={save} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Save changes</button><button type="button" onClick={onClose} className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200">Close slip</button></div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-7">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="flex flex-wrap gap-3"><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{active.badge}</span><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">{active.type}</span>{saved ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Saved</span> : null}</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(active.fields || []).map(([name, label, type]) => <SlipField key={name} name={name} label={label} type={type} value={draft.form[name]} onChange={updateForm} />)}</div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">AI suggested input</div>
                <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Action title</label>
                <input value={draft.title} onChange={(e) => update("title", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-black tracking-[-0.04em] text-slate-950 outline-none focus:border-blue-300" />
                <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">What Churvox prepared</label>
                <textarea value={draft.summary} onChange={(e) => update("summary", e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none focus:border-blue-300" />
                <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Editable draft wording / worker note / customer message / invoice description</label>
                <textarea value={draft.preparedText} onChange={(e) => update("preparedText", e.target.value)} rows={8} className="mt-2 w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-950 outline-none focus:border-blue-300" />
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Evidence checked — editable</div>
                <div className="mt-4 space-y-3">{draft.evidence.map((row, index) => <div key={`${row}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span><input value={row} onChange={(e) => updateEvidence(index, e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none" /></div>)}</div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[28px] border border-slate-900 bg-[#143658] p-5 text-white shadow-[0_20px_60px_rgba(12,33,57,0.20)]"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner decision</div><p className="mt-3 text-sm font-semibold leading-6 text-slate-200">This is the form. Edit it here, save it here, approve it here. No second page needed.</p><button type="button" onClick={() => { save(); onClose(); }} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">{active.primary}</button><Link to={active.href} className="mt-3 inline-flex w-full justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open full record only if needed</Link></section>
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Owner note</div><textarea value={draft.ownerNote} onChange={(e) => update("ownerNote", e.target.value)} rows={6} placeholder="Add a note before approving..." className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none focus:border-blue-300" /></section>
              <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Launch rule</div><p className="mt-2 text-sm font-bold leading-6 text-amber-950">Every slip should open as a filled form: worker, job, invoice, quote, payment or completion details already suggested by Churvox.</p></section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  return <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block" data-sidebar-version="clean-command-20260601"><div className="mb-6 flex items-center gap-3 px-1"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div><div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div></div><div className="space-y-5">{navGroups.map((group) => <section key={group.title}><div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div><nav className="space-y-1">{group.items.map(([label, href, icon]) => { const active = isActivePath(pathname, href); return <Link key={`${href}-${label}`} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span><span className="truncate">{label}</span></Link>; })}</nav></section>)}</div></aside>;
}

function CommandDeskCleanContent() {
  const [activeSlip, setActiveSlip] = React.useState(null);
  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Command Board</div><div className="text-sm font-bold text-slate-500">What needs attention, what Churvox prepared, what to approve next.</div></div><div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Prepared forms</div></header>
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]"><div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" /><div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Built for trade owners</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Churvox prepares the form. You approve.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Each Work Slip opens full screen with the worker, job, invoice, quote or payment fields already suggested and editable.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setActiveSlip(approvals[0])} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400">Open next prepared form</button><Link to="/jobs" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open work list</Link></div></div></div></div><div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Owner queue</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">Ready as forms</h2></div><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{approvals.length} ready</span></div><div className="mt-5 space-y-3">{approvals.map((item) => <button key={item.title} type="button" onClick={() => setActiveSlip(item)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-200 hover:bg-blue-50"><div className="text-sm font-black text-slate-950">{item.badge}</div><div className="mt-1 text-xs font-bold text-slate-500">Open full-screen form, edit, approve.</div></button>)}</div></div></section>
          <section className="mt-5 grid gap-4 md:grid-cols-4">{stats.map((item) => <Stat key={item[0]} item={item} />)}</section>
          <section className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_0.78fr]"><div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Owner decisions</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">AI-prepared forms</h2></div><span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 sm:inline-flex">Editable slips</span></div><div className="grid gap-4 md:grid-cols-2">{approvals.map((item) => <Approval key={item.title} item={item} onOpen={setActiveSlip} />)}</div></div><div className="space-y-5"><div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Today’s run sheet</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Work in motion</h2><div className="mt-5 space-y-3">{jobs.map(([time, name, state]) => <div key={`${time}-${name}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><div className="text-sm font-black text-slate-950">{name}</div><div className="mt-1 text-xs font-bold text-slate-500">{time}</div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{state}</span></div>)}</div></div><div className="rounded-[28px] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Ask Churvox</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Command box</h2><p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Ask what needs approving, what is late, what is ready to invoice, or who should take the next job.</p><div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-slate-200">“Show me prepared forms ready today”</div></div></div></section>
        </section>
      </div>
      <WorkSlip active={activeSlip} onClose={() => setActiveSlip(null)} />
    </main>
  );
}

export default function CommandDeskCleanHomePage() {
  if (typeof document === "undefined") return <CommandDeskCleanContent />;
  return createPortal(<CommandDeskCleanContent />, document.body);
}
