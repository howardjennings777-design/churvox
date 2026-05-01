import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { safeArray, safeText } from "../utils/safeRender";

const idOf = (item) => String(item?.id || item?._id || "");

export default function FollowUpsPage() {
  const { get, post, del } = useApi();
  const [tasks, setTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ title: "", description: "", due_at: "", priority: "normal" });

  const load = useCallback(async () => {
    setLoading(true);
    const [res, sug] = await Promise.all([get(`/follow-up-tasks?status=${filter}`), get("/follow-up-suggestions")]);
    if (res?.success) setTasks(safeArray(res.data));
    if (sug?.success) setSuggestions(safeArray(sug.data, "items"));
    setLoading(false);
  }, [get, filter]);

  useEffect(() => { load(); }, [load]);

  const dismiss = async (key) => {
    const r = await post(`/follow-up-suggestions/${encodeURIComponent(key)}/dismiss`);
    if (r?.success) { toast.success("Suggestion dismissed"); load(); } else toast.error("Could not dismiss suggestion");
  };

  const stats = useMemo(() => ({ total: tasks.length, suggestions: suggestions.length }), [tasks, suggestions]);

  return <Layout><div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6"><h1 className="text-3xl font-black">Follow-ups</h1>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border p-4 bg-white"><div className="flex items-center justify-between"><h2 className="font-black">Smart suggestions</h2><Button onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
      <p className="text-xs text-slate-500 mt-1">Approval-first: these are drafts only. Nothing sends automatically.</p>
      {loading ? <p className="mt-3 text-sm">Loading suggestions...</p> : !suggestions.length ? <p className="mt-3 text-sm">No smart suggestions right now.</p> : <div className="mt-3 space-y-3">{suggestions.map((s)=><div key={s.key} className="rounded-xl border p-3"><p className="font-bold">{safeText(s.title,"Suggestion")}</p><p className="text-xs text-slate-600 mt-1">{safeText(s.reason,"Reason unavailable")}</p><div className="mt-3 flex flex-wrap gap-2"><Link className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white" to={s.route || "/follow-ups"}>Open record</Link><button className="rounded-lg border px-3 py-1.5 text-xs font-black" onClick={()=>navigator.clipboard?.writeText(s.draft_text || "")}>Copy draft</button><button className="rounded-lg border px-3 py-1.5 text-xs font-black" onClick={()=>dismiss(s.key)}>Dismiss</button></div></div>)}</div>}
      </section>
      <section className="rounded-2xl border p-4 bg-white"><p className="text-sm">Tasks shown: {stats.total} • Suggestions: {stats.suggestions}</p></section>
    </div></div></Layout>;
}
