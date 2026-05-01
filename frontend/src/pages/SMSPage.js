import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const templates = [
  ["customer_reminder", "Job reminder", "Friendly reminder about your scheduled Churvox job."],
  ["on_the_way", "On the way", "On the way — we will arrive shortly."],
  ["invoice_reminder", "Invoice reminder", "Friendly reminder: your invoice is due for payment."],
  ["quote_followup", "Quote follow-up", "Following up on your quote — let us know if you would like to proceed."],
  ["custom", "Custom message", ""],
];

export default function SMSPage() {
  const { get, post } = useApi();
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [type, setType] = useState("customer_reminder");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(templates[0][2]);
  const [status, setStatus] = useState("");
  const [buying, setBuying] = useState(0);

  useEffect(() => { (async () => {
    const [b, h] = await Promise.allSettled([get("/sms/balance"), get("/sms/history")]);
    setBalance(b.status === "fulfilled" && b.value?.success ? b.value.data : { configured: false, credits: 0, message: "SMS is not fully configured yet" });
    setHistory(h.status === "fulfilled" && h.value?.success ? (h.value.data?.history || []) : []);
  })(); }, [get]);

  const send = async () => {
    if (!window.confirm("Send this SMS now?")) return;
    const payload = { type, phone: to, custom_message: type === "custom" ? message : undefined };
    const r = await post("/sms/send", payload);
    setStatus(r?.success ? "SMS sent." : (r?.error || "SMS failed."));
  };
  const buyCredits = async (pack) => {
    setBuying(pack);
    const res = await post("/sms/buy-credits", { pack });
    setBuying(0);
    if (res?.success && res?.data?.checkout_url) {
      window.open(res.data.checkout_url, "_blank", "noopener,noreferrer");
      return;
    }
    setStatus(res?.error || "SMS is not fully configured yet");
  };

  return <Layout><div className="cx-page space-y-4">
    <h1 className="text-3xl font-black text-slate-950">Communications / SMS</h1>
    <p className="text-slate-700">Manual send only. No automatic SMS actions are enabled.</p>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">Credits</p><p className="text-slate-800">Balance: {balance?.credits ?? balance?.balance ?? 0}</p>{!balance?.configured && <p className="text-amber-700 text-sm">SMS is not fully configured yet</p>}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">Credit packs</p><div className="mt-2 grid md:grid-cols-3 gap-2">{[[100,"$10"],[500,"$45"],[1000,"$80"]].map(([p,price])=><button key={p} disabled={!balance?.configured || buying===p} onClick={()=>buyCredits(p)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 font-semibold disabled:opacity-60">{p} credits / {price}</button>)}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"><p className="font-black text-slate-950">Draft message templates</p><select className="w-full border rounded-xl p-2 text-slate-900" value={type} onChange={(e)=>{const v=e.target.value;setType(v);const f=templates.find((t)=>t[0]===v);if(v!=="custom") setMessage(f?.[2]||"");}}>{templates.map((t)=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select><input className="w-full border rounded-xl p-2 text-slate-900" placeholder="Recipient phone" value={to} onChange={(e)=>setTo(e.target.value)} />
    <textarea className="w-full border rounded-xl p-2 text-slate-900" rows={4} value={message} onChange={(e)=>setMessage(e.target.value)} />
    <button onClick={send} className="rounded-xl bg-blue-600 text-white font-black px-4 py-2">Send SMS</button>{status && <p className="text-sm text-slate-700">{status}</p>}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">SMS history</p><ul className="mt-2 text-sm text-slate-700 space-y-1">{history.slice(0,20).map((h,i)=><li key={i}>{h.to || h.phone || "recipient"} · {h.message || "message"} · {h.status || "sent"}</li>)}{!history.length && <li>No SMS history yet.</li>}</ul></div>
  </div></Layout>;
}
