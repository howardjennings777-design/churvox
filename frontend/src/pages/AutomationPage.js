// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const EMPTY_FORM = {
  name: "",
  description: "",
  trigger: "",
  action: "",
  enabled: true,
  approval_first: true,
  template_key: "",
  delay: "",
  conditions: "",
};

const asList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
};

const rid = (x) => x?.id || x?._id || "";
const rstatus = (x) => String(x?.status || x?.state || x?.outcome || "").toLowerCase();

export default function AutomationPage() {
  const { get, post, patch, del } = useApi();
  const [templates, setTemplates] = useState([]);
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [t, r, rn] = await Promise.allSettled([get("/automation/templates"), get("/automation/rules"), get("/automation/runs?limit=5")]);
    if (t.status === "fulfilled" && t.value?.success) setTemplates(asList(t.value.data, "templates")); else setTemplates([]);
    if (r.status === "fulfilled" && r.value?.success) setRules(asList(r.value.data, "rules")); else setRules([]);
    if (rn.status === "fulfilled" && rn.value?.success) setRuns(asList(rn.value.data, "runs")); else setRuns([]);
    const errs = [t, r, rn].filter((x) => x.status === "rejected" || (x.status === "fulfilled" && !x.value?.success));
    if (errs.length > 0) {
      const first = errs[0];
      const msg = first.status === "rejected" ? first.reason?.message : first.value?.error;
      setError(msg || "Some automation data failed to load.");
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((x) => x.enabled !== false).length;
    const paused = total - active;
    const failedRuns = runs.filter((x) => rstatus(x) === "failed").length;
    const approvalFirst = rules.filter((x) => x.approval_first !== false).length;
    return { total, active, paused, failedRuns, approvalFirst, recentRuns: runs.length };
  }, [rules, runs]);

  const applyTemplate = (t) => setForm({ ...EMPTY_FORM, ...t, enabled: false, template_key: t.key || "", delay: "", conditions: "" });

  const createFromTemplate = async (t) => {
    applyTemplate(t);
    await saveRule({ ...EMPTY_FORM, ...t, enabled: false, template_key: t.key || "" }, false);
  };

  const saveRule = async (source = form, isEdit = !!editingId) => {
    if (!source.name || !source.trigger || !source.action) return setError("Name, trigger, and action are required.");
    setSaving(true); setError(""); setNotice("");
    let conditions = undefined;
    if (source.conditions) {
      try { conditions = JSON.parse(source.conditions); } catch { return setError("Conditions must be valid JSON."), setSaving(false); }
    }
    const payload = {
      name: source.name, description: source.description, trigger: source.trigger, action: source.action,
      enabled: !!source.enabled, approval_first: !!source.approval_first, template_key: source.template_key || undefined,
      delay: source.delay || undefined, conditions,
    };
    const res = isEdit ? await patch(`/automation/rules/${editingId}`, payload) : await post("/automation/rules", payload);
    setSaving(false);
    if (!res?.success) return setError(res?.error || "Could not save rule.");
    setNotice(isEdit ? "Rule updated." : "Rule created.");
    setForm(EMPTY_FORM); setEditingId("");
    await load();
  };

  const startEdit = (r) => {
    setEditingId(rid(r));
    setForm({ ...EMPTY_FORM, ...r, conditions: r.conditions ? JSON.stringify(r.conditions) : "" });
  };

  const toggleRule = async (r) => {
    const id = rid(r);
    const res = await post(`/automation/rules/${id}/toggle`, { enabled: !(r.enabled !== false) });
    if (!res?.success) return setError(res?.error || "Could not toggle rule.");
    await load();
  };

  const deleteRule = async (r) => {
    if (!window.confirm("Delete this rule?")) return;
    const res = await del(`/automation/rules/${rid(r)}`);
    if (!res?.success) return setError(res?.error || "Could not delete rule.");
    await load();
  };

  const testRule = async (r) => {
    const res = await post(`/automation/rules/${rid(r)}/test`, {});
    if (!res?.success) return setError(res?.error || "Could not queue safe test run.");
    setNotice("Safe test run queued.");
    await load();
  };

  if (error.toLowerCase().includes("403") || error.toLowerCase().includes("access")) {
    return <Layout><div className="max-w-5xl mx-auto p-6"><div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 font-semibold">Access denied. Automation is available to owner, manager, admin, and office admin roles.</div></div></Layout>;
  }

  return <Layout><div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-950">Automation</h1><p className="text-slate-700">Approval-first workflow rules for jobs, quotes, invoices, and team updates.</p><p className="text-xs text-slate-700 mt-2">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-bold">Refresh</button><Link to="/automation/runs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 font-bold">Automation Runs</Link></div></div></div>
    <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-slate-800"><ul className="list-disc ml-5"><li>Approval-first by default.</li><li>No automatic SMS or email sending.</li><li>No automatic MYOB sync.</li><li>No payroll changes.</li></ul></div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Object.entries({"Active rules":stats.active,"Paused rules":stats.paused,"Total rules":stats.total,"Recent runs":stats.recentRuns,"Failed runs":stats.failedRuns,"Approval-first rules":stats.approvalFirst}).map(([k,v])=><div key={k} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-700">{k}</p><p className="text-2xl font-black text-slate-950">{v}</p></div>)}</div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 font-semibold">{error}</div>}
    {notice && <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-green-700 font-semibold">{notice}</div>}
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950 mb-3">Template library</h2><div className="grid md:grid-cols-2 gap-3">{templates.map((t)=><div key={t.key||t.name} className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-950">{t.name}</h3><p className="text-sm text-slate-700">{t.description}</p><p className="text-xs text-slate-700 mt-2">{t.trigger} → {t.action}</p><div className="flex gap-2 mt-3"><button onClick={()=>applyTemplate(t)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 font-semibold">Use template</button><button onClick={()=>createFromTemplate(t)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-white font-semibold">Create rule</button></div></div>)}</div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950 mb-3">Rule builder</h2><div className="grid md:grid-cols-2 gap-3">{["name","description","trigger","action","delay"].map((f)=><input key={f} value={form[f]||""} onChange={(e)=>setForm({...form,[f]:e.target.value})} placeholder={f} className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900" />)}<textarea value={form.conditions} onChange={(e)=>setForm({...form,conditions:e.target.value})} placeholder="conditions JSON (optional)" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-slate-900"/><label><input type="checkbox" checked={form.enabled} onChange={(e)=>setForm({...form,enabled:e.target.checked})}/> Enabled</label><label><input type="checkbox" checked={form.approval_first} onChange={(e)=>setForm({...form,approval_first:e.target.checked})}/> Approval-first</label></div><div className="mt-3 flex gap-2"><button disabled={saving} onClick={()=>saveRule()} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-bold">{editingId?"Save changes":"Create rule"}</button>{editingId&&<button onClick={()=>{setEditingId("");setForm(EMPTY_FORM);}} className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-900">Cancel edit</button>}</div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950 mb-3">Rules list</h2>{!loading && rules.length===0?<div className="text-slate-700">No rules yet. Create from a template.</div>:<div className="space-y-3">{rules.map((r)=><div key={rid(r)} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between flex-wrap gap-2"><div><p className="font-bold text-slate-950">{r.name}</p><p className="text-sm text-slate-700">{r.description}</p><p className="text-xs text-slate-700">{r.trigger} → {r.action || (r.actions?.[0]?.type || "-")}</p></div><div className="flex gap-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${r.enabled!==false?"bg-green-50 text-green-700":"bg-slate-100 text-slate-700"}`}>{r.enabled!==false?"Enabled":"Paused"}</span><span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{r.approval_first!==false?"Approval-first":"No approval"}</span></div></div><div className="mt-3 flex gap-2 flex-wrap"><button onClick={()=>startEdit(r)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 font-semibold">Edit</button><button onClick={()=>toggleRule(r)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 font-semibold">{r.enabled!==false?"Pause":"Resume"}</button><button onClick={()=>deleteRule(r)} className="rounded-xl border border-red-300 px-3 py-1.5 text-red-700 font-semibold">Delete</button><button onClick={()=>testRule(r)} className="rounded-xl border border-blue-300 px-3 py-1.5 text-blue-700 font-semibold">Test</button></div></div>)}</div>}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950 mb-3">Recent runs preview</h2><div className="space-y-2">{runs.map((x)=><div key={rid(x)} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold text-slate-900">{x.rule_name || "Rule"} · <span className="text-slate-700">{rstatus(x) || "queued"}</span></p><p className="text-xs text-slate-700">{x.started_at ? new Date(x.started_at).toLocaleString() : "-"} · actions: {(x.results||[]).length}</p>{x.error&&<p className="text-xs text-red-700">{x.error}</p>}</div>)}</div><Link to="/automation/runs" className="inline-block mt-3 text-blue-700 font-bold">View all runs</Link></div>
  </div></Layout>;
}
