import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

export default function SupportPage() {
  const { get, post } = useApi();
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: "", category: "Jobs", priority: "normal", message: "" });
  useEffect(() => { get("/support/tickets").then((r) => setTickets(Array.isArray(r?.data) ? r.data : [])); }, [get]);
  const submit = async (e) => { e.preventDefault(); const res = await post("/support/tickets", form); if (res.success) setTickets((v) => [res.data, ...v]); };
  return <Layout><section className="cx-page space-y-4"><h1 className="text-3xl font-black text-slate-950">Support</h1><p className="text-sm font-semibold text-slate-700">Contact: hello@churvox.com</p><form onSubmit={submit} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4"><input required placeholder="Subject" className="rounded border px-3 py-2" value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})}/><textarea required placeholder="Message" className="rounded border px-3 py-2" value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})}/><button className="rounded bg-blue-600 px-3 py-2 text-sm font-black text-white">Submit ticket</button></form><div className="space-y-2">{tickets.map((t, i)=><div key={t.id||i} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">{t.subject || "Support ticket"}</div>)}</div></section></Layout>;
}
