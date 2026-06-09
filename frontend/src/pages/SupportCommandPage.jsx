import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { industrialChip, industrialContentLane, industrialPageShell } from "../components/industrialCommandTheme";

const helpTypes = ["Setup help", "Broken button or page", "Invoices or quotes", "Billing or plan", "Xero setup", "Team or worker app", "Other help"];

export default function SupportCommandPage() {
  const api = useApi();
  const { user } = useAuth();
  const [type, setType] = React.useState(helpTypes[0]);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState("");

  async function sendMessage() {
    const clean = message.trim();
    if (!clean) {
      toast.error("Write the message first");
      return;
    }
    setSending(true);
    setStatus("Sending support message...");
    try {
      const res = await api.post("/support/contact", {
        help_type: type,
        message: clean,
        page_url: window.location.href,
        user_email: user?.email || "",
        user_name: user?.name || user?.full_name || "",
        business_name: user?.business_name || user?.company_name || ""
      });
      if (res?.success === false || res?.data?.success === false) {
        throw new Error(res?.error || res?.data?.error || "Send failed");
      }
      setMessage("");
      setStatus("Support message sent. Churvox will reply by email.");
      toast.success("Support message sent");
    } catch (err) {
      setStatus("Could not send from this page. Please try again in a moment.");
      toast.error(err?.message || "Could not send support message");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={industrialPageShell} data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="supportHero relative isolate overflow-hidden rounded-[34px] border-l-8 border-orange-500 bg-[radial-gradient(circle_at_86%_-24%,rgba(249,115,22,.52),transparent_34%),radial-gradient(circle_at_14%_116%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#0b1018_0%,#111827_56%,#070b12_100%)] p-8 text-white shadow-[0_24px_70px_rgba(2,6,23,.24)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.055)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,.035)_0_1px,transparent_1px_46px),linear-gradient(120deg,transparent_0_46%,rgba(251,191,36,.13)_46%_47%,transparent_47%_100%)] opacity-70" />
          <div className="pointer-events-none absolute -right-20 -top-20 z-0 h-[250px] w-[250px] rounded-full border-[36px] border-orange-500/20" />
          <div className="relative z-10">
            <span className={industrialChip}>Support</span>
            <h1 className="mt-5 text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Email support only.</h1>
            <p className="mt-5 max-w-3xl text-base font-bold leading-7 text-slate-100">Type the issue here and send it to Churvox support from this page.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard" className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white no-underline">Command Board</Link>
              <Link to="/settings-board" className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white no-underline">Settings</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.07)]">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Support request</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Send support message</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Choose the help type, write the message, then press Send support message.</p>

            <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">
              Help type
              <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl border border-slate-300 bg-white p-4 text-base font-bold normal-case tracking-normal text-slate-950">
                {helpTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us the page, button, what you expected, and what happened." className="min-h-[190px] rounded-2xl border border-slate-300 bg-white p-4 text-base font-bold normal-case tracking-normal text-slate-950" />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={sendMessage} disabled={sending} className="rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-60">{sending ? "Sending..." : "Send support message"}</button>
              <button type="button" onClick={() => { setMessage(""); setStatus("Cleared. Ready for a new message."); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-950">Clear</button>
            </div>
            {status ? <div className="mt-4 rounded-2xl bg-emerald-100 p-4 text-sm font-black leading-6 text-emerald-900">{status}</div> : null}
          </section>

          <aside className="grid content-start gap-4">
            {["Setup help", "Invoices or quotes", "Billing or plan"].map((item) => (
              <section key={item} className="rounded-[28px] border-l-8 border-orange-400 bg-slate-950 p-5 text-white shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Help area</div>
                <h3 className="mt-2 text-xl font-black">{item}</h3>
                <button type="button" onClick={() => setType(item)} className="mt-4 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Use type</button>
              </section>
            ))}
          </aside>
        </section>
      </section>
    </main>
  );
}
