// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
// CHURVOX_NEW_FRONTEND_REAL_PAGE
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const TEMPLATE_OPTIONS = [
  { key: "job_reminder", label: "Job reminder", text: "Hi, this is a reminder about your scheduled job. Please reply if anything has changed." },
  { key: "on_the_way", label: "On the way", text: "Hi, we are on the way to your job now." },
  { key: "invoice_reminder", label: "Invoice reminder", text: "Hi, this is a friendly reminder that your invoice is still awaiting payment." },
  { key: "quote_follow_up", label: "Quote follow-up", text: "Hi, just checking if you had any questions about the quote we sent through." },
  { key: "custom", label: "Custom", text: "" },
];

const PACKS = [{pack:"100",credits:100,price:"$10"},{pack:"500",credits:500,price:"$45"},{pack:"1000",credits:1000,price:"$80"}];

export default function SMSPage() {
  const { get, post } = useApi();
  const [balance, setBalance] = useState({ configured: false, credits: 0, low_credit: false });
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [template, setTemplate] = useState("job_reminder");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState(TEMPLATE_OPTIONS[0].text);
  const [jobId, setJobId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [buyingPack, setBuyingPack] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const credits = Number(balance?.credits ?? balance?.balance ?? 0) || 0;
  const estimatedCredits = Math.max(1, Math.ceil((message || "").length / 160));

  const pageStatus = useMemo(() => {
    if (!balance?.configured) return { text: "Not configured", css: "bg-red-100 text-red-800" };
    if (credits < 20) return { text: "Low credits", css: "bg-amber-100 text-amber-800" };
    return { text: "Ready", css: "bg-green-100 text-green-800" };
  }, [balance?.configured, credits]);

  const loadData = async () => {
    setLoadError("");
    setAccessDenied(false);
    const [b, h] = await Promise.allSettled([get("/sms/balance"), get("/sms/history")]);
    const errors = [];

    if (b.status === "fulfilled" && b.value?.success) {
      const raw = b.value.data || {};
      setBalance({
        configured: !!raw.configured,
        credits: Number(raw.credits ?? raw.balance ?? 0) || 0,
        provider: raw.provider || "",
        low_credit: !!raw.low_credit || Number(raw.credits ?? raw.balance ?? 0) < 20,
      });
    } else {
      const msg = b.status === "fulfilled" ? b.value?.error : "Failed to load SMS balance";
      if (String(msg || "").includes("403")) setAccessDenied(true);
      errors.push(msg || "Failed to load SMS balance");
    }

    if (h.status === "fulfilled" && h.value?.success) {
      const rows = h.value.data?.history || h.value.data || [];
      setHistory(Array.isArray(rows) ? rows : []);
    } else {
      const msg = h.status === "fulfilled" ? h.value?.error : "Failed to load SMS history";
      if (String(msg || "").includes("403")) setAccessDenied(true);
      errors.push(msg || "Failed to load SMS history");
    }

    if (errors.length) setLoadError(errors.join(" · "));
    setLastUpdated(new Date());
  };

  useEffect(() => { loadData(); }, []);

  const onTemplateChange = (value) => {
    setTemplate(value);
    const selected = TEMPLATE_OPTIONS.find((t) => t.key === value);
    if (value !== "custom") setMessage(selected?.text || "");
  };

  const onBuyPack = async (pack) => {
    setBuyingPack(pack);
    setSendResult(null);
    const res = await post("/sms/buy-credits", { pack });
    setBuyingPack("");
    if (!res?.success) {
      setSendResult({ kind: res?.not_configured ? "not_configured" : "error", text: res?.error || "Purchase failed" });
      return;
    }
    const checkout = res?.data?.checkout_url || res?.checkout_url;
    if (checkout) {
      window.open(checkout, "_blank", "noopener,noreferrer");
      return;
    }
    setSendResult({ kind: "error", text: "Checkout response did not include a URL." });
  };

  const submitSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendResult(null);
    const payload = {
      recipient_phone: recipientPhone,
      phone: recipientPhone,
      to: recipientPhone,
      message_type: template,
      type: template,
      custom_message: message,
      message,
      job_id: jobId || undefined,
      invoice_id: invoiceId || undefined,
      client_id: clientRef || undefined,
    };
    const res = await post("/sms/send", payload);
    setSending(false);
    if (res?.success) {
      setSendResult({ kind: "success", text: "SMS sent successfully." });
      loadData();
      return;
    }
    if (res?.not_configured || (res?.error || "").includes("not fully configured")) {
      setSendResult({ kind: "not_configured", text: "SMS is not fully configured yet" });
    } else if (res?.insufficient_credits || (res?.error || "").toLowerCase().includes("credit")) {
      setSendResult({ kind: "insufficient", text: "Insufficient SMS credits" });
    } else if ((res?.error || "").includes("403")) {
      setAccessDenied(true);
      setSendResult({ kind: "error", text: "Access denied for SMS sending." });
    } else {
      setSendResult({ kind: "error", text: res?.error || "SMS failed." });
    }
  };

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-3xl font-black text-slate-950">Communications / SMS</h1><p className="text-slate-700 mt-1">Manual customer messaging for reminders, updates, and follow-ups.</p></div>
        <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${pageStatus.css}`}>{pageStatus.text}</span><button onClick={loadData} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Refresh</button></div>
      </div>
      <p className="mt-3 text-sm text-slate-700">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "Not loaded yet"}</p>
    </section>

    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-bold">Manual send only.</p><p>No automatic SMS actions are enabled.</p><p>Every message requires confirmation before sending.</p></section>
    {loadError ? <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{loadError}</section> : null}
    {accessDenied ? <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 font-semibold">Access denied. You do not have permission to use SMS.</section> : null}

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950">Credit balance</h2><p className="mt-2 text-slate-800">Current credits: <span className="font-black">{credits}</span></p><p className="text-slate-700">Provider configured: {balance?.configured ? "Yes" : "No"}</p>{credits < 20 ? <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-amber-800 font-semibold">Low credit warning</p> : null}<a href="#sms-packs" className="mt-3 inline-block text-blue-700 font-semibold">Go to buy credits</a></div>
      <div id="sms-packs" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950">Credit packs</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">{PACKS.map((p)=><div key={p.pack} className="rounded-2xl border border-slate-200 p-3"><p className="text-slate-950 font-black">{p.credits} credits</p><p className="text-slate-700">{p.price}</p><button onClick={()=>onBuyPack(p.pack)} disabled={buyingPack===p.pack} className="mt-2 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:bg-blue-400">{buyingPack===p.pack?"Loading...":"Buy"}</button></div>)}</div></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"><h2 className="text-xl font-black text-slate-950">Draft message</h2>
      <select value={template} onChange={(e)=>onTemplateChange(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2 text-slate-900">{TEMPLATE_OPTIONS.map((t)=><option key={t.key} value={t.key}>{t.label}</option>)}</select>
      <input value={recipientPhone} onChange={(e)=>setRecipientPhone(e.target.value)} placeholder="Recipient phone" className="w-full rounded-xl border border-slate-300 p-2 text-slate-900" />
      <div className="grid gap-2 sm:grid-cols-3"><input value={clientRef} onChange={(e)=>setClientRef(e.target.value)} placeholder="Client reference" className="rounded-xl border border-slate-300 p-2 text-slate-900" /><input value={jobId} onChange={(e)=>setJobId(e.target.value)} placeholder="Job ID (optional)" className="rounded-xl border border-slate-300 p-2 text-slate-900" /><input value={invoiceId} onChange={(e)=>setInvoiceId(e.target.value)} placeholder="Invoice ID (optional)" className="rounded-xl border border-slate-300 p-2 text-slate-900" /></div>
      <textarea rows={4} value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2 text-slate-900" />
      <div className="flex flex-wrap gap-4 text-sm text-slate-700"><p>Characters: {message.length}</p><p>Estimated SMS credits used: {estimatedCredits}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">Preview</p><p className="text-slate-900">{message || "(empty)"}</p></div>
      <button disabled={sending || !recipientPhone || !message.trim()} onClick={()=>setConfirmOpen(true)} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:bg-blue-400">{sending?"Sending...":"Send SMS"}</button>
    </section>

    {confirmOpen ? <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5"><p className="font-black text-slate-950">Send this SMS now?</p><p className="text-slate-800">Recipient: {recipientPhone}</p><p className="text-slate-800">Estimated credits: {estimatedCredits}</p><p className="text-slate-800">Message: {message}</p><div className="mt-3 flex gap-2"><button onClick={submitSend} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Confirm send</button><button onClick={()=>setConfirmOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-900">Cancel</button></div></section> : null}

    {sendResult ? <section className={`rounded-2xl p-4 font-semibold ${sendResult.kind === "success" ? "border border-green-200 bg-green-50 text-green-800" : sendResult.kind === "insufficient" ? "border border-amber-200 bg-amber-50 text-amber-800" : sendResult.kind === "not_configured" ? "border border-red-200 bg-red-50 text-red-800" : "border border-red-200 bg-red-50 text-red-800"}`}>{sendResult.text}</section> : null}

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950">SMS history</h2><div className="mt-3 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-700"><th className="p-2">Date/Time</th><th className="p-2">Recipient</th><th className="p-2">Message / Type</th><th className="p-2">Status</th><th className="p-2">Credits</th><th className="p-2">Error</th></tr></thead><tbody>{history.length ? history.map((item, i)=><tr key={i} className="border-t border-slate-100 text-slate-800"><td className="p-2">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</td><td className="p-2">{item.recipient_phone || item.phone || item.to || "-"}</td><td className="p-2">{item.message || "-"} <span className="text-xs text-slate-700">({item.message_type || "unknown"})</span></td><td className="p-2">{item.status || "unknown"}</td><td className="p-2">{item.credits_used ?? item.cost ?? "-"}</td><td className="p-2">{item.error || ""}</td></tr>) : <tr><td colSpan={6} className="p-3 text-slate-700">No SMS history yet.</td></tr>}</tbody></table></div></section>
  </div></Layout>;
}
