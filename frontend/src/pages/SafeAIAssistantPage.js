import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const safeArray = (value, key) => {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  if (key && Array.isArray(value?.data?.[key])) return value.data[key];
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};
const txt = (v, f = "") => (v === null || v === undefined || v === "" ? f : String(v));
const unwrap = (settled) => {
  if (settled?.status !== "fulfilled" || !settled.value?.success) return null;
  return settled.value?.data || {};
};
const withTimeout = (promise, ms = 7000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)),
]);

export default function SafeAIAssistantPage() {
  const { get, post, del } = useApi();
  const [actions, setActions] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [brief, setBrief] = useState(null);
  const [memory, setMemory] = useState([]);
  const [profit, setProfit] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [draftType, setDraftType] = useState("invoice_reminder");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");

  const loadAll = async () => {
    const ws = [];
    const calls = await Promise.allSettled([
      withTimeout(get("/ai/actions"), 5000),
      withTimeout(get("/ai/drafts"), 5000),
      withTimeout(get("/ai/automation-suggestions"), 5000),
      withTimeout(get("/ai/daily-brief"), 5000),
      withTimeout(get("/ai/business-memory"), 5000),
      withTimeout(get("/profit/snapshot"), 5000),
    ]);

    const actionsPayload = unwrap(calls[0]);
    if (actionsPayload) setActions(safeArray(actionsPayload, "actions"));
    else { ws.push("Saved AI Actions backend unavailable. Using safe fallback."); setActions([]); }

    const draftsPayload = unwrap(calls[1]);
    if (draftsPayload) setDrafts(safeArray(draftsPayload, "drafts"));
    else { ws.push("Saved AI Drafts backend unavailable. Using safe fallback."); setDrafts([]); }

    const ideasPayload = unwrap(calls[2]);
    if (ideasPayload) setIdeas(safeArray(ideasPayload, "suggestions"));
    else { ws.push("Saved Automation Ideas backend unavailable. Using safe fallback."); setIdeas([]); }

    const briefPayload = unwrap(calls[3]);
    if (briefPayload) setBrief(briefPayload.brief || briefPayload.daily_brief || briefPayload.snapshot || briefPayload || null);
    else { ws.push("Daily Brief backend unavailable. Using safe fallback."); setBrief(null); }

    const memoryPayload = unwrap(calls[4]);
    if (memoryPayload) setMemory(safeArray(memoryPayload, "memory"));
    else { ws.push("Business Memory backend unavailable. Using safe fallback."); setMemory([]); }

    const profitPayload = unwrap(calls[5]);
    if (profitPayload) setProfit(profitPayload.snapshot || profitPayload.profit || profitPayload || null);
    else { ws.push("Profit Foundations backend unavailable. Using safe fallback."); setProfit(null); }

    setWarnings(ws);
  };

  useEffect(() => { loadAll(); }, []);

  const run = async (label, fn) => {
    setBusy(label);
    try {
      const res = await withTimeout(fn(), 7000);
      if (res && res.success === false) {
        setWarnings((prev) => [...prev, `${label} failed: ${res.error || "backend unavailable"}`]);
      }
    } catch (err) {
      setWarnings((prev) => [...prev, `${label} timed out or failed. Safe fallback kept the page usable.`]);
    } finally {
      setBusy("");
      await loadAll();
    }
  };

  const mutateAction = (id, op) => run(`action-${op}`, () => post(`/ai/actions/${id}/${op}`, {}));
  const mutateIdea = (id, op) => run(`idea-${op}`, () => post(`/ai/automation-suggestions/${id}/${op}`, {}));
  const mutateDraft = (id, op) => run(`draft-${op}`, () => op === "delete" ? del(`/ai/drafts/${id}`) : post(`/ai/drafts/${id}/${op}`, {}));

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-black">AI Business Assistant</h1>
      <p className="text-sm">AI suggests. You approve. No emails, SMS, payroll, MYOB sync, pricing, status, or customer data changes happen automatically.</p>
      {busy && <p className="mt-2 text-xs font-bold text-blue-700">Working: {busy}...</p>}
    </section>

    {warnings.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">{warnings.join(" ")}</section>}

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Saved AI Actions</h2>
      <button className="rounded border px-2 py-1 text-xs" onClick={() => run("generate-actions", () => post('/ai/actions/generate',{}))}>Generate saved actions</button>
      {actions.length===0 ? <p className="text-sm">No saved actions yet.</p> : actions.map(a => <div key={a.id} className="mt-2 rounded border p-2 text-sm"><b>{a.title}</b> — {a.description}<div className="text-xs">{a.priority}/{a.confidence} • {a.status}</div><div className="flex gap-2 text-xs"><button onClick={()=>mutateAction(a.id,'dismiss')}>Dismiss</button><button onClick={()=>mutateAction(a.id,'snooze')}>Snooze</button><button onClick={()=>mutateAction(a.id,'complete')}>Complete</button><button onClick={()=>mutateAction(a.id,'approve')}>Approve</button></div></div>)}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Saved AI Drafts</h2>
      <div className="flex gap-2"><select value={draftType} onChange={(e)=>setDraftType(e.target.value)} className="rounded border px-2 py-1 text-xs"><option>quote_follow_up</option><option>invoice_reminder</option><option>job_reminder</option><option>job_completion_summary</option><option>customer_update</option><option>worker_instruction</option><option>quote_wording</option><option>invoice_wording</option><option>client_missing_details_request</option></select><button className="rounded border px-2 py-1 text-xs" onClick={() => run("create-draft", () => post('/ai/drafts/create',{type:draftType}))}>Create draft</button></div>
      {drafts.length===0 ? <p className="text-sm">No saved drafts yet.</p> : drafts.map(d => <div key={d.id} className="mt-2 rounded border p-2 text-sm"><b>{d.title || d.type}</b><p>{d.draft_text}</p><div className="flex gap-2 text-xs"><button onClick={async()=>{await navigator.clipboard.writeText(txt(d.draft_text));setCopied(d.id);}}>Copy draft</button><button onClick={()=>mutateDraft(d.id,'mark-used')}>Mark used</button><button onClick={()=>mutateDraft(d.id,'dismiss')}>Dismiss</button><button onClick={()=>mutateDraft(d.id,'delete')}>Delete</button></div>{copied===d.id&&<div className="text-xs text-emerald-700">Copied. AI suggests. You approve.</div>}</div>)}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Saved Automation Ideas</h2>
      <button className="rounded border px-2 py-1 text-xs" onClick={() => run("generate-automation", () => post('/ai/automation-suggestions/generate',{}))}>Generate automation suggestions</button>
      {ideas.length===0 ? <p className="text-sm">No saved ideas yet.</p> : ideas.map(s => <div key={s.id} className="mt-2 rounded border p-2 text-sm"><b>{s.title}</b><p>{s.description}</p><div className="text-xs">{s.status} • AI suggests. You approve.</div><div className="flex gap-2 text-xs"><button onClick={()=>mutateIdea(s.id,'approve')}>Approve</button><button onClick={()=>mutateIdea(s.id,'dismiss')}>Dismiss</button><button onClick={()=>mutateIdea(s.id,'snooze')}>Snooze</button></div></div>)}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Daily Brief</h2>
      <button className="rounded border px-2 py-1 text-xs" onClick={() => run("daily-brief", () => post('/ai/daily-brief/generate',{}))}>Generate daily brief</button>
      {brief ? <div className="text-sm"><p><b>{brief.headline}</b></p><p>{brief.summary}</p></div> : <p className="text-sm">No saved brief yet.</p>}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Business Memory</h2>
      <button className="rounded border px-2 py-1 text-xs" onClick={() => run("business-memory", () => post('/ai/business-memory/refresh',{}))}>Refresh memory</button>
      {memory.length===0 ? <p className="text-sm">No saved memory yet.</p> : memory.map(m => <div key={m.id} className="mt-2 rounded border p-2 text-sm"><b>{m.title}</b><p>{m.description}</p><button className="text-xs" onClick={() => run("dismiss-memory", () => post(`/ai/business-memory/${m.id}/dismiss`,{}))}>Dismiss</button></div>)}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">Profit Foundations</h2>
      <button className="rounded border px-2 py-1 text-xs" onClick={() => run("profit-snapshot", () => post('/profit/snapshot/generate',{}))}>Generate profit snapshot</button>
      {profit ? <div className="text-sm"><p>Revenue signal: {txt(profit.revenue_signal,0)}</p><p>Estimated margin: {txt(profit.estimated_margin,0)}</p><p>Cash waiting: {txt(profit.unpaid_invoice_value,0)}</p><p>{txt(profit.warning,"profit is not final until expenses and payments are complete")}</p></div> : <p className="text-sm">No profit snapshot yet.</p>}
    </section>
  </div></Layout>;
}
