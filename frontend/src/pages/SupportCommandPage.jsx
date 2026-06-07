import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const quickHelp = [
  ["Setup help", "Get the first client, job, invoice and worker flow set up cleanly."],
  ["Something is broken", "Report the page, button or action that did not work."],
  ["Invoices or quotes", "Help with drafts, follow-ups, customer links and approvals."],
  ["Team or worker app", "Help with invites, worker jobs, photos and field workflow."],
  ["Billing or plan", "Plan access, trials, Operator, Command, MYOB and growth packs."],
  ["MYOB / integrations", "Accounting sync questions and staged integration help."],
];

const docs = [
  ["Getting started", "Add business details, first client, first job, first invoice, then invite crew.", "/onboarding"],
  ["Customer request form", "Use public intake so customers can request work and the owner approves the next step.", "/request-work.html"],
  ["Customer portal", "Proof photos, quote links, invoice links and repeat work direction.", "/customer-portal.html"],
  ["Review engine", "Prepare review, referral and repeat-work prompts after completed jobs.", "/review-engine.html"],
  ["Trust centre", "Plain-English security, approval-first and payroll limitation notes.", "/trust-center.html"],
  ["Pricing", "Start, Crew, Operator, Command and Growth Pack structure.", "/plans"],
];

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
    const res = await post("/support/tickets", payload, { timeout: 8000 });
    setSending(false);
    try {
      const saved = JSON.parse(localStorage.getItem("churvox_support_tickets") || "[]");
      saved.unshift({ ...payload, server_saved: Boolean(res?.success) });
      localStorage.setItem("churvox_support_tickets", JSON.stringify(saved.slice(0, 50)));
    } catch (err) {}
    if (res?.success) toast.success("Support request saved.");
    else toast.success("Support request saved locally. Use hello@churvox.com as backup.");
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-[#f5f2ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[34px] bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,.22)] md:p-8">
          <div className="inline-flex rounded-full bg-orange-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-200">Help centre</div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] md:text-7xl">Get unstuck fast.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Support is built around setup, launch and real work. No 24/7 promise yet — just clear help so customers can get moving.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:hello@churvox.com" className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-black text-slate-950 no-underline">Email hello@churvox.com</a>
            <Link to="/dashboard" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Back to Command</Link>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]">
          <form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Ask support</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Send a help request</h2>
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
            <button type="submit" disabled={sending} className="mt-4 rounded-2xl bg-orange-400 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-orange-400/20 disabled:opacity-70">{sending ? "Sending…" : "Send support request"}</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            {quickHelp.map(([title, copy]) => (
              <article key={title} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <h3 className="text-xl font-black tracking-[-.04em] text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy}</p>
              </article>
            ))}
          </section>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Help docs</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Top-player support links</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {docs.map(([title, copy, href]) => (
              <a key={title} href={href} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-slate-950 no-underline transition hover:border-orange-200 hover:bg-orange-50">
                <b className="text-lg font-black tracking-[-.04em]">{title}</b>
                <span className="mt-2 block text-sm font-bold leading-6 text-slate-600">{copy}</span>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
