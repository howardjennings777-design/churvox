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

const supportEmail = "hello@churvox.com";

const quickHelp = [
  { id: "setup", title: "Setup help", color: "#fb923c", copy: "First client, first job, first invoice and first worker invite.", details: [["Best first step", "Check Settings, then create one client, one job and one invoice or quote."], ["What to send", "Tell support what step you are on and what stopped you."], ["Useful page", "Settings and Command Board are the best starting points."]], href: "/settings-board" },
  { id: "broken", title: "Broken button or page", color: "#f43f5e", copy: "Tell support exactly what page and button failed so it can be fixed fast.", details: [["Best first step", "Name the page, the button, and what happened after tapping."], ["What to send", "Include the screen name, phone/tablet/desktop and any error wording."], ["Rule", "Broken buttons should be fixed or removed, not left confusing."]], href: "/dashboard" },
  { id: "money", title: "Invoices or quotes", color: "#34d399", copy: "Drafts, approvals, customer links, follow-ups and payment issues.", details: [["Best first step", "Open the invoice or quote slip first."], ["What to send", "Client, invoice/quote number and the action that failed."], ["Rule", "Owner approval comes before sending or syncing money admin."]], href: "/invoices-board" },
  { id: "team", title: "Team or worker app", color: "#22d3ee", copy: "Invites, worker jobs, job photos and field workflow.", details: [["Best first step", "Check Team, Jobs and Crew Dispatch."], ["What to send", "Worker email, job name and whether it is owner-side or worker-side."], ["Rule", "Workers should not see pricing or GPS evidence."]], href: "/team-board" },
  { id: "billing", title: "Billing or plan", color: "#facc15", copy: "Start, Crew, Operator, Command, Xero and Growth Pack questions.", details: [["Best first step", "Open Plans and check current plan access."], ["What to send", "Current plan, wanted plan and what feature is locked."], ["Rule", "Plan changes stay owner-controlled."]], href: "/plans" },
  { id: "xero", title: "Xero / integrations", color: "#a78bfa", copy: "Accounting sync questions and staged Xero integration help.", details: [["Best first step", "Use approval-first wording and keep sync staged."], ["What to send", "What you want synced and whether it is invoice, payment or contact related."], ["Rule", "No accounting changes happen without owner approval."]], href: "/settings-board" },
];

const supportCards = [
  ["Launch setup path", "Business settings → client → job → invoice/quote → worker invite.", "/settings-board"],
  ["Jobs", "Create and edit job records, pricing source, recurring work and invoice handoff.", "/jobs-board"],
  ["Crew Dispatch", "Assign crew, check capacity/conflicts, start, pause, resume and complete work.", "/dispatch-board"],
  ["Team", "Worker invites, resend setup emails, workload and access review.", "/team-board"],
  ["Invoices", "Draft, send, mark paid, cancel and review linked work.", "/invoices-board"],
  ["Quotes", "Create, send, follow up, accept/decline and convert to jobs.", "/quotes-board"],
  ["Clients", "Customer details, related jobs/quotes/invoices and quick creation actions.", "/clients-board"],
  ["Reports", "Export job, invoice, quote, client and team summaries.", "/reports-board"],
  ["Payroll", "Review job-time summaries and export payroll handoff CSV.", "/payroll-board"],
  ["Plans", "Check Start, Crew, Operator, Command and Growth Pack access.", "/plans"],
  ["Privacy Policy", "Open the privacy page.", "/privacy"],
  ["Terms", "Open the terms page.", "/terms"],
  ["Account deletion", "Open the account deletion help page.", "/account-deletion"],
];

function Tape({ color = "#fb923c" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 20px ${color}66` }} />; }
function DarkCard({ children, color = "#fb923c", className = "" }) { return <article className={`relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white ${className}`} style={tileStyle}><Tape color={color} />{children}</article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 break-words text-sm font-black leading-6 text-white">{value}</div></div>; }
function mailHref(type, message = "") {
  const subject = `Churvox support: ${type || "Help request"}`;
  const body = message ? `Hi Churvox,\n\n${message}\n\nPage: ${window.location.pathname}\n` : `Hi Churvox,\n\nI need help with ${type || "Churvox"}.\n\nPage: ${window.location.pathname}\n`;
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function HelpSlip({ item, reviewed, onClose, onReview, onUseType }) {
  if (!item) return null;
  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true"><div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]"><header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Support slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{item.title}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{item.copy}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header><div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7"><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Support guidance</div><div className="mt-4 grid gap-3 md:grid-cols-2">{item.details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section><aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Use the correct workspace first, then send a support request with the exact page/button if needed.</p>{reviewed ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Reviewed. This support path has been checked.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onReview} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Mark support path reviewed</button><Link to={item.href} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open useful page</Link><button type="button" onClick={() => { onUseType(item.title); onClose(); }} className="rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950">Use this help type</button><a href={mailHref(item.title)} className="rounded-2xl bg-white/10 px-5 py-4 text-center text-sm font-black text-white no-underline ring-1 ring-white/10">Email support</a><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to support</button></div></aside></div></div></div>;
}

export default function SupportCommandPage() {
  const { post } = useApi();
  const [type, setType] = React.useState("Setup help");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [selectedHelp, setSelectedHelp] = React.useState(null);
  const [tickets, setTickets] = React.useState(() => { try { return JSON.parse(localStorage.getItem("churvox_support_tickets") || "[]"); } catch { return []; } });
  const [reviewed, setReviewed] = React.useState(() => { try { return JSON.parse(localStorage.getItem("churvox_support_reviewed") || "{}"); } catch { return {}; } });

  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return toast.error("Add a short message first");
    setSending(true);
    const payload = { type, message: message.trim(), page: window.location.pathname || "/support-board", source: "support_board", created_at: new Date().toISOString(), user_agent: navigator.userAgent };
    let res = null;
    try { res = await post("/support/tickets", payload, { timeout: 8000 }); } catch { res = null; }
    setSending(false);
    const nextTickets = [{ ...payload, server_saved: Boolean(res?.success) }, ...tickets].slice(0, 50);
    setTickets(nextTickets);
    try { localStorage.setItem("churvox_support_tickets", JSON.stringify(nextTickets)); } catch {}
    if (res?.success) toast.success("Support request saved");
    else toast.success("Support request saved locally. Use Email support as backup.");
    setMessage("");
  };

  const selectedId = selectedHelp?.id || "current";
  function markReviewed(item) { const next = { ...reviewed, [item.id]: true }; setReviewed(next); localStorage.setItem("churvox_support_reviewed", JSON.stringify(next)); toast.success("Support path marked reviewed"); }
  function clearLocalTickets() { if (!window.confirm("Clear local support request history on this device?")) return; setTickets([]); localStorage.removeItem("churvox_support_tickets"); toast.success("Local support history cleared"); }

  return <main className={industrialPageShell} data-industrial-simple-page="support" data-command-canvas><section className={`${industrialContentLane} space-y-5`}><DarkCard className="p-6 pl-9 md:p-8 md:pl-10"><span className={industrialChip}>Support</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Get unstuck fast.</h1><p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Support is built around launch, setup and real work. Use the right workspace first, then send a clean help request with the exact page and button.</p><div className="mt-6 flex flex-wrap gap-3"><a href={mailHref(type, message)} className={`rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Email {supportEmail}</a><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link><Link to="/settings-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Settings</Link></div></DarkCard>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]"><form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Ask support</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Send a help request</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">Requests are saved locally even if the server ticket endpoint is unavailable. The email button opens a backup email with the same topic.</p><label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Help type<select value={type} onChange={(event) => setType(event.target.value)} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950">{quickHelp.map((item) => <option key={item.id}>{item.title}</option>)}</select></label><label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Page, button, what you expected, and what happened." className="min-h-[180px] rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950" /></label><div className="mt-4 flex flex-wrap gap-3"><button type="submit" disabled={sending} className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/20 disabled:opacity-70">{sending ? "Sending…" : "Save support request"}</button><a href={mailHref(type, message)} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-950 no-underline">Email backup</a></div></form><section className="grid gap-4 md:grid-cols-2">{quickHelp.map((item) => <DarkCard key={item.id} color={item.color} className="min-h-[150px]"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Help area</div><h3 className="mt-2 text-xl font-black tracking-[-.04em] text-white">{item.title}</h3></div>{reviewed[item.id] ? <span className="rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-950">Reviewed</span> : null}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{item.copy}</p><button type="button" onClick={() => setSelectedHelp(item)} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Review slip</button></DarkCard>)}</section></section>

    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch support paths</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Every link goes somewhere useful</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{supportCards.map(([title, copy, href]) => <Link key={title} to={href} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 no-underline transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"><div className="text-lg font-black tracking-[-.04em] text-slate-950">{title}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy}</p></Link>)}</div></section>

    <section className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Local request history</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Saved on this device</h2><div className="mt-5 grid gap-3">{tickets.length ? tickets.slice(0, 6).map((ticket, index) => <div key={`${ticket.created_at}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm font-black text-slate-950">{ticket.type}</b><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${ticket.server_saved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{ticket.server_saved ? "Server saved" : "Local"}</span></div><p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-600">{ticket.message}</p><p className="mt-2 text-xs font-black text-slate-400">{new Date(ticket.created_at).toLocaleString("en-NZ")}</p></div>) : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-600">No saved support requests yet.</div>}</div></section><aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-red-600">Safety rules</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">What support will not do silently</h2><div className="mt-5 grid gap-3 text-sm font-black leading-6 text-slate-700"><div className="rounded-2xl bg-slate-50 p-3">No customer messages sent without owner approval.</div><div className="rounded-2xl bg-slate-50 p-3">No payroll, tax or bank-file processing from support.</div><div className="rounded-2xl bg-slate-50 p-3">No accounting sync changes without owner approval.</div><div className="rounded-2xl bg-slate-50 p-3">No dead buttons should remain after launch cleanup.</div></div><button type="button" onClick={clearLocalTickets} className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950">Clear local support history</button></aside></section>
  </section><HelpSlip item={selectedHelp} reviewed={Boolean(reviewed[selectedId])} onClose={() => setSelectedHelp(null)} onReview={() => selectedHelp && markReviewed(selectedHelp)} onUseType={(nextType) => { setType(nextType); setTimeout(() => document.querySelector("textarea")?.focus(), 50); }} /></main>;
}
