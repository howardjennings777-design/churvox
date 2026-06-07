import React from "react";
import { Link } from "react-router-dom";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const sections = [
  { id: "profile", title: "Business profile", badge: "Launch basics", color: "#fb923c", href: "/settings", copy: "Business name, contact details, address, GST settings and launch basics.", details: [["Purpose", "Keep the business identity and customer-facing details correct."], ["Check", "Business name, email, phone, address, GST and invoice details."], ["Rule", "Only change these from the full editor when a save form is available."]] },
  { id: "branding", title: "Branding", badge: "Keep consistent", color: "#22d3ee", href: "/settings", copy: "Logo, colours, customer-facing wording and invoice/quote presentation.", details: [["Purpose", "Keep customer-facing quotes, invoices and screens looking like Churvox."], ["Check", "Logo, colour, business wording and document presentation."], ["Rule", "No random old themes or mismatched branding."]] },
  { id: "accounting", title: "Xero accounting", badge: "Approval first", color: "#34d399", href: "/support", copy: "Xero is the visible accounting direction for launch. Sync remains staged and approval-first.", details: [["Purpose", "Prepare invoice/payment sync direction without overpromising."], ["Check", "Accounting wording, support path and approval-first sync copy."], ["Rule", "No automatic accounting changes without owner approval."]] },
  { id: "plans", title: "Plan and billing", badge: "Owner only", color: "#facc15", href: "/plans", copy: "Start, Crew, Operator, Command and Growth Pack access.", details: [["Purpose", "Keep pricing and plan access clear."], ["Check", "Current plan, upgrade path and Growth Pack wording."], ["Rule", "Plan changes stay owner-controlled."]] },
  { id: "team", title: "Team access", badge: "Role safe", color: "#a78bfa", href: "/team", copy: "Roles, invites, worker access and payroll permissions.", details: [["Purpose", "Keep staff access safe and simple."], ["Check", "Owner, Manager, Office Admin, Worker and Payroll roles."], ["Rule", "Payroll stays locked down. Workers do not see pricing or GPS evidence."]] },
  { id: "legal", title: "Legal and support", badge: "Live links", color: "#f43f5e", href: "/support", copy: "Privacy, terms, account deletion, help and setup support.", details: [["Purpose", "Make support and legal pages easy to find."], ["Check", "Privacy, terms, account deletion and help links."], ["Rule", "Legal/support links must be tappable on mobile."]] },
];

const checklist = [
  "Business profile completed",
  "Logo and customer-facing details checked",
  "First client created",
  "First job created",
  "First invoice or quote reviewed",
  "Worker invite tested",
  "Xero shown as accounting direction",
  "Old experimental pages hidden from launch",
];

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 20px ${color}66` }} />;
}

function DarkCard({ children, color = "#fb923c", className = "" }) {
  return <article className={`relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white ${className}`} style={tileStyle}><Tape color={color} />{children}</article>;
}

function Detail({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{value}</div></div>;
}

function SettingsSlip({ section, approved, onClose, onApprove }) {
  if (!section) return null;
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Settings slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{section.title}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{section.copy}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review setting area</div><div className="mt-4 grid gap-3 md:grid-cols-2">{section.details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the setting here first. Open the related page only when there is a clear save, billing, support or full-editor action.</p>{approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This settings slip is marked reviewed.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button><Link to={section.href} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open related page</Link><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to settings</button></div></aside>
        </div>
      </div>
    </div>
  );
}

export default function SettingsCommandPage() {
  const [selectedSection, setSelectedSection] = React.useState(null);
  const [approved, setApproved] = React.useState({});
  const selectedId = selectedSection?.id || "current";

  return (
    <main className={industrialPageShell} data-industrial-simple-page="settings" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <DarkCard className="p-6 pl-9 md:p-8 md:pl-10">
          <span className={industrialChip}>Settings</span>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Set the business up once. Keep it clean.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Settings is for business details, branding, plan access, Xero direction, roles and support. No old integration clutter.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link to="/plans" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>View plans</Link><Link to="/support" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Get support</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div>
        </DarkCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
          <section className="grid gap-4 md:grid-cols-2">
            {sections.map((section) => <DarkCard key={section.id} color={section.color} className="min-h-[180px]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{section.badge}</div><h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">{section.title}</h2><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{section.copy}</p><button type="button" onClick={() => setSelectedSection(section)} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Review slip</button></DarkCard>)}
          </section>

          <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Launch checklist</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Before going live</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">These are the settings-level checks that stop the app feeling unfinished.</p>
            <div className="mt-5 grid gap-3">{checklist.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span><span className="text-sm font-black leading-6 text-slate-800">{item}</span></div>)}</div>
          </aside>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Accounting direction</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Xero visible. Approval-first sync.</h2><p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">For launch polish, Churvox should talk about Xero where accounting is visible. Accounting sync should stay approval-first: Churvox prepares the admin, the owner approves it.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/support" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">Ask about Xero setup</Link><Link to="/invoices" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Review invoices</Link></div></section>
      </section>
      <SettingsSlip section={selectedSection} approved={Boolean(approved[selectedId])} onClose={() => setSelectedSection(null)} onApprove={() => setApproved((prev) => ({ ...prev, [selectedId]: true }))} />
    </main>
  );
}
