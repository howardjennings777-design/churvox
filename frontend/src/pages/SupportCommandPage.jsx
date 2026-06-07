import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const quickHelp = [
  ["Setup help", "First client, first job, first invoice and first worker invite."],
  ["Broken button or page", "Tell us exactly what page and button failed so it can be fixed fast."],
  ["Invoices or quotes", "Drafts, approvals, customer links, follow-ups and payment issues."],
  ["Team or worker app", "Invites, worker jobs, job photos and field workflow."],
  ["Billing or plan", "Start, Crew, Operator, Command, Xero and Growth Pack questions."],
  ["Xero / integrations", "Accounting sync questions and staged Xero integration help."],
];

const supportCards = [
  ["Launch setup path", "Add business details, create a client, create a job, create an invoice, then invite crew.", "/settings"],
  ["Jobs and crew", "Use Jobs and Crew Map for work that needs assigning, starting, finishing or invoicing.", "/jobs"],
  ["Invoices and quotes", "Use approval-first slips before sending invoices, quote follow-ups or customer messages.", "/invoices"],
  ["Xero direction", "Xero is the visible accounting direction for launch polish.", "/settings"],
  ["Plans", "Check Start, Crew, Operator, Command and Growth Pack access.", "/plans"],
  ["Command Board", "Return to the owner command centre.", "/dashboard"],
];

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.3) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 20px ${color}66` }} />;
}

function DarkCard({ children, color = "#fb923c", className = "" }) {
  return (
    <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24),inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}>
      <Tape color={color} />
      {children}
    </article>
  );
}

export default function SupportCommandPage() {
  const { post } = useApi();
  const [type, setType] = React.useState("Setup help");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

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

  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <DarkCard className="p-6 pl-9 md:p-8 md:pl-10">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Support</div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Get unstuck fast.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Support is built around launch, setup and real work. Xero is the visible accounting direction while we keep the launch app clean and focused.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:hello@churvox.com" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-lg shadow-orange-500/20">Email hello@churvox.com</a>
            <Link to="/dashboard" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Back to Command</Link>
          </div>
        </DarkCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]">
          <form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Ask support</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Send a help request</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Saved requests stay in the app locally even if the support endpoint is unavailable.</p>
            <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">
              Help type
              <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950">
                {quickHelp.map(([label]) => <option key={label}>{label}</option>)}
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">
              Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What are you trying to do and what happened?" className="min-h-[180px] rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base font-bold normal-case tracking-normal text-slate-950" />
            </label>
            <button type="submit" disabled={sending} className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/20 disabled:opacity-70">{sending ? "Sending…" : "Send support request"}</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            {quickHelp.map(([title, copy], index) => (
              <DarkCard key={title} color={["#fb923c", "#22d3ee", "#34d399", "#facc15", "#a78bfa", "#f43f5e"][index % 6]} className="min-h-[150px]">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Help area</div>
                <h3 className="mt-2 text-xl font-black tracking-[-.04em] text-white">{title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{copy}</p>
              </DarkCard>
            ))}
          </section>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch support paths</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Every link goes somewhere useful</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {supportCards.map(([title, copy, href]) => (
              <Link key={title} to={href} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-slate-950 no-underline transition hover:border-orange-200 hover:bg-orange-50">
                <b className="text-lg font-black tracking-[-.04em]">{title}</b>
                <span className="mt-2 block text-sm font-bold leading-6 text-slate-600">{copy}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
