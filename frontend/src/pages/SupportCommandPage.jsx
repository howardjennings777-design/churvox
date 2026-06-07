import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const quickHelp = [
  { id: "setup", title: "Setup help", color: "#fb923c", copy: "First client, first job, first invoice and first worker invite.", details: [["Best first step", "Check Settings, then create one client, one job and one invoice/quote."], ["What to send", "Tell support what step you are on and what stopped you."], ["Useful page", "Settings and Command Board are the best starting points."]], href: "/settings" },
  { id: "broken", title: "Broken button or page", color: "#f43f5e", copy: "Tell us exactly what page and button failed so it can be fixed fast.", details: [["Best first step", "Name the page, the button, and what happened after tapping."], ["What to send", "Include the screen name, phone/tablet/desktop and any error wording."], ["Rule", "Broken buttons should be fixed or removed, not left confusing."]], href: "/dashboard" },
  { id: "money", title: "Invoices or quotes", color: "#34d399", copy: "Drafts, approvals, customer links, follow-ups and payment issues.", details: [["Best first step", "Open the invoice or quote slip first."], ["What to send", "Client, invoice/quote number and the action that failed."], ["Rule", "Owner approval comes before sending or syncing money admin."]], href: "/invoices" },
  { id: "team", title: "Team or worker app", color: "#22d3ee", copy: "Invites, worker jobs, job photos and field workflow.", details: [["Best first step", "Check Team, Jobs and Crew Dispatch."], ["What to send", "Worker email, job name and whether it is owner-side or worker-side."], ["Rule", "Workers should not see pricing or GPS evidence."]], href: "/team" },
  { id: "billing", title: "Billing or plan", color: "#facc15", copy: "Start, Crew, Operator, Command, Xero and Growth Pack questions.", details: [["Best first step", "Open Plans and check current plan access."], ["What to send", "Current plan, wanted plan and what feature is locked."], ["Rule", "Plan changes stay owner-controlled."]], href: "/plans" },
  { id: "xero", title: "Xero / integrations", color: "#a78bfa", copy: "Accounting sync questions and staged Xero integration help.", details: [["Best first step", "Use approval-first wording and keep sync staged."], ["What to send", "What you want synced and whether it is invoice, payment or contact related."], ["Rule", "No accounting changes happen without owner approval."]], href: "/settings" },
];

const supportCards = [
  ["Launch setup path", "Add business details, create a client, create a job, create an invoice, then invite crew.", "/settings"],
  ["Jobs and crew", "Use Jobs and Crew Dispatch for work that needs assigning, starting, finishing or invoicing.", "/jobs"],
  ["Invoices and quotes", "Use approval-first slips before sending invoices, quote follow-ups or customer messages.", "/invoices"],
  ["Xero direction", "Xero is the visible accounting direction for launch polish.", "/settings"],
  ["Plans", "Check Start, Crew, Operator, Command and Growth Pack access.", "/plans"],
  ["Command Board", "Return to the owner command centre.", "/dashboard"],
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

function HelpSlip({ item, approved, onClose, onApprove }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Support slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{item.title}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{item.copy}</p></div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Support guidance</div><div className="mt-4 grid gap-3 md:grid-cols-2">{item.details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the help path, then open the useful page or send a support request from the form.</p>{approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This support slip is marked reviewed.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button><Link to={item.href} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open useful page</Link><a href="mailto:hello@churvox.com" className="rounded-2xl bg-white/10 px-5 py-4 text-center text-sm font-black text-white no-underline ring-1 ring-white/10">Email support</a><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to support</button></div></aside>
        </div>
      </div>
    </div>
  );
}

export default function SupportCommandPage() {
  const { post } = useApi();
  const [type, setType] = React.useState("Setup help");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [selectedHelp, setSelectedHelp] = React.useState(null);
  const [approved, setApproved] = React.useState({});

  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error("Add a short message first");
      return;
    }
    setSending(true);
    const payload = { type, message: message.trim(), page: "/support", source: "support_page", created_at: new Date().toISOString() };
    let res = null;
    try {
      res = await post("/support/tickets", payload, { timeout: 8000 });
    } catch (err) {
      res = null;
    }
    setSending(false);
    try {
      const saved = JSON.parse(localStorage.getItem("churvox_support_tickets") || "[]");
      saved.unshift({ ...payload, server_saved: Boolean(res?.success) });
      localStorage.setItem("churvox_support_tickets", JSON.stringify(saved.slice(0, 50)));
    } catch (err) {}
    if (res?.success) toast.success("Support request saved.");
    else toast.success("Support request saved locally. Email hello@churvox.com as backup.");
    setMessage("");
  };

  const selectedId = selectedHelp?.id || "current";

  return (
    <main className={industrialPageShell} data-industrial-simple-page="support" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <DarkCard className="p-6 pl-9 md:p-8 md:pl-10">
          <span className={industrialChip}>Support</span>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Get unstuck fast.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Support is built around launch, setup and real work. Xero is the visible accounting direction while Churvox stays clean, focused and approval-first.</p>
          <div className="mt-6 flex flex-wrap gap-3"><a href="mailto:hello@churvox.com" className={`rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Email hello@churvox.com</a><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div>
        </DarkCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]">
          <form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Ask support</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Send a help request</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Saved requests stay in the app locally even if the support endpoint is unavailable.</p>
            <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Help type<select value={type} onChange={(event) => setType(event.target.value)} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950">{quickHelp.map((item) => <option key={item.id}>{item.title}</option>)}</select></label>
            <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What are you trying to do and what happened?" className="min-h-[180px] rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950" /></label>
            <button type="submit" disabled={sending} className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/20 disabled:opacity-70">{sending ? "Sending…" : "Send support request"}</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            {quickHelp.map((item) => <DarkCard key={item.id} color={item.color} className="min-h-[150px]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Help area</div><h3 className="mt-2 text-xl font-black tracking-[-.04em] text-white">{item.title}</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{item.copy}</p><button type="button" onClick={() => setSelectedHelp(item)} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Review slip</button></DarkCard>)}
          </section>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch support paths</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Every link goes somewhere useful</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{supportCards.map(([title, copy, href]) => <Link key={title} to={href} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-slate-950 no-underline transition hover:border-orange-200 hover:bg-orange-50"><b className="text-lg font-black tracking-[-.04em]">{title}</b><span className="mt-2 block text-sm font-bold leading-6 text-slate-600">{copy}</span></Link>)}</div></section>
      </section>
      <HelpSlip item={selectedHelp} approved={Boolean(approved[selectedId])} onClose={() => setSelectedHelp(null)} onApprove={() => setApproved((prev) => ({ ...prev, [selectedId]: true }))} />
    </main>
  );
}
