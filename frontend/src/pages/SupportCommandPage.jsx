import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const supportEmail = "hello@churvox.com";
const tileStyle = { background: "linear-gradient(135deg, #111827, #070d16)", color: "#ffffff", boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)" };

const quickHelp = [
  { id: "setup", title: "Setup help", color: "#fb923c", copy: "Business setup, first client, first job, first invoice and first worker invite.", href: "/settings-board" },
  { id: "broken", title: "Broken button or page", color: "#f43f5e", copy: "Send the exact page, button and what happened after tapping.", href: "/dashboard" },
  { id: "money", title: "Invoices or quotes", color: "#34d399", copy: "Drafts, approvals, customer links, follow-ups and payment issues.", href: "/invoices-board" },
  { id: "team", title: "Team or worker app", color: "#22d3ee", copy: "Invites, worker jobs, job photos and field workflow.", href: "/team-board" },
  { id: "billing", title: "Billing or plan", color: "#facc15", copy: "Start, Crew, Operator, Command, Xero add-on and Growth Pack questions.", href: "/plans" },
  { id: "xero", title: "Xero setup", color: "#a78bfa", copy: "Xero add-on, connection status and future sync setup questions.", href: "/settings-board" },
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
  ["Plans", "Check Start, Crew, Operator, Command, Xero and Growth Pack access.", "/plans"],
  ["Privacy Policy", "Open the privacy page.", "/privacy"],
  ["Terms", "Open the terms page.", "/terms"],
  ["Account deletion", "Open the account deletion help page.", "/account-deletion"],
];

function Tape({ color = "#fb923c" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 20px ${color}66` }} />; }
function DarkCard({ children, color = "#fb923c", className = "" }) { return <article className={`relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white ${className}`} style={tileStyle}><Tape color={color} />{children}</article>; }
function mailHref(type, message = "") { const subject = `Churvox support: ${type || "Help request"}`; const body = `Hi Churvox,\n\nI need help with ${type || "Churvox"}.\n\n${message || ""}\n\nPage: ${window.location.pathname}\n`; return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }

export default function SupportCommandPage() {
  const [type, setType] = React.useState("Setup help");
  const [message, setMessage] = React.useState("");
  const [reviewed, setReviewed] = React.useState(() => { try { return JSON.parse(localStorage.getItem("churvox_support_reviewed") || "{}"); } catch { return {}; } });
  const markReviewed = (item) => { const next = { ...reviewed, [item.id]: true }; setReviewed(next); localStorage.setItem("churvox_support_reviewed", JSON.stringify(next)); toast.success("Support path marked reviewed"); };

  return <main className={industrialPageShell} data-industrial-simple-page="support" data-command-canvas><section className={`${industrialContentLane} space-y-5`}>
    <DarkCard className="p-6 pl-9 md:p-8 md:pl-10"><span className={industrialChip}>Support</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Email support only.</h1><p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">For now, all Churvox support communication goes through email. No phone number or contact-number support is shown.</p><div className="mt-6 flex flex-wrap gap-3"><a href={mailHref(type, message)} className={`rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Email {supportEmail}</a><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link><Link to="/settings-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Settings</Link></div></DarkCard>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]"><section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Email support request</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Prepare the email</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">Choose the help type, write the issue, then tap Email support. This opens your email app with the message filled in.</p><label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Help type<select value={type} onChange={(event) => setType(event.target.value)} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950">{quickHelp.map((item) => <option key={item.id}>{item.title}</option>)}</select></label><label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Page, button, what you expected, and what happened." className="min-h-[180px] rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950" /></label><div className="mt-4 flex flex-wrap gap-3"><a href={mailHref(type, message)} className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white no-underline shadow-lg shadow-slate-950/20">Email support</a><button type="button" onClick={() => { setType("Setup help"); setMessage(""); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-950">Clear</button></div></section><section className="grid gap-4 md:grid-cols-2">{quickHelp.map((item) => <DarkCard key={item.id} color={item.color} className="min-h-[150px]"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Help area</div><h3 className="mt-2 text-xl font-black tracking-[-.04em] text-white">{item.title}</h3></div>{reviewed[item.id] ? <span className="rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-950">Reviewed</span> : null}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{item.copy}</p><div className="mt-4 flex flex-wrap gap-2"><Link to={item.href} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 no-underline">Open page</Link><button type="button" onClick={() => { setType(item.title); markReviewed(item); }} className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Use type</button></div></DarkCard>)}</section></section>
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch support paths</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Every link goes somewhere useful</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{supportCards.map(([title, copy, href]) => <Link key={title} to={href} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 no-underline transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"><div className="text-lg font-black tracking-[-.04em] text-slate-950">{title}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy}</p></Link>)}</div></section>
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-red-600">Safety rules</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">What support will not do silently</h2><div className="mt-5 grid gap-3 text-sm font-black leading-6 text-slate-700 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-3">No customer messages sent without owner approval.</div><div className="rounded-2xl bg-slate-50 p-3">No payroll, tax or bank-file processing from support.</div><div className="rounded-2xl bg-slate-50 p-3">No accounting sync changes without owner approval.</div><div className="rounded-2xl bg-slate-50 p-3">No phone/contact-number support shown for now.</div></div></section>
  </section></main>;
}
