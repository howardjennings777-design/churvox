import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Play, History } from "lucide-react";

const EMPTY_RULE = () => ({
  name: "",
  description: "",
  trigger: "",
  enabled: true,
  condition_mode: "all",
  conditions: [],
  actions: [],
});

export default function AutomationPage() {
  const { get, post, put, del } = useApi();
  const [catalog, setCatalog] = useState({ triggers: [], actions: [], operators: [] });
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null); // null | rule being edited (new or existing)

  const load = useCallback(async () => {
    setLoading(true);
    const [cat, rulesRes] = await Promise.all([get("/automation/catalog"), get("/automation/rules")]);
    if (cat?.success) setCatalog(cat.data || {});
    if (rulesRes?.success) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name || !draft.trigger) { toast.error("Name and trigger are required"); return; }
    const body = { ...draft };
    const res = draft.id
      ? await put(`/automation/rules/${draft.id}`, body)
      : await post("/automation/rules", body);
    if (res?.success) {
      toast.success(draft.id ? "Rule updated" : "Rule created");
      setDraft(null);
      load();
    } else {
      toast.error(res?.error || "Failed to save rule");
    }
  };

  const toggle = async (r) => {
    const res = await post(`/automation/rules/${r.id}/toggle`);
    if (res?.success) load();
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    const res = await del(`/automation/rules/${r.id}`);
    if (res?.success) { toast.success("Rule deleted"); load(); }
  };

  const runTest = async (r) => {
    const res = await post(`/automation/rules/${r.id}/run-test`, { payload: {} });
    if (res?.success) {
      const run = res.data?.run;
      toast.success(`Test run: ${run?.status} (${run?.results?.length || 0} actions)`);
    } else {
      toast.error(res?.error || "Test failed");
    }
  };

  const addCondition = () => setDraft((d) => ({ ...d, conditions: [...d.conditions, { path: "", op: "equals", value: "" }] }));
  const setCondition = (i, patch) => setDraft((d) => ({ ...d, conditions: d.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  const rmCondition = (i) => setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, idx) => idx !== i) }));

  const addAction = () => setDraft((d) => ({ ...d, actions: [...d.actions, { type: "log", config: { message: "" } }] }));
  const setAction = (i, patch) => setDraft((d) => ({ ...d, actions: d.actions.map((a, idx) => idx === i ? { ...a, ...patch } : a) }));
  const rmAction = (i) => setDraft((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" /> Automations
            </h1>
            <p className="text-sm text-slate-500">Create rules that run when events happen in Churvox.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/automation/runs"><History className="h-4 w-4 mr-1" /> Run history</Link>
            </Button>
            <Button onClick={() => setDraft(EMPTY_RULE())} data-testid="new-rule-btn">
              <Plus className="h-4 w-4 mr-1" /> New rule
            </Button>
          </div>
        </div>

        {draft && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4" data-testid="rule-builder">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{draft.id ? "Edit rule" : "New rule"}</h3>
              <button onClick={() => setDraft(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Notify me on job completion" data-testid="rule-name-input" />
              </div>
              <div>
                <Label>Trigger</Label>
                <select
                  value={draft.trigger}
                  onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                  data-testid="rule-trigger-select"
                >
                  <option value="">Select trigger...</option>
                  {catalog.triggers.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this rule does" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Conditions (match {draft.condition_mode === "all" ? "all" : "any"})</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={draft.condition_mode}
                    onChange={(e) => setDraft({ ...draft, condition_mode: e.target.value })}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                  >
                    <option value="all">all</option>
                    <option value="any">any</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={addCondition} data-testid="add-condition-btn">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
              {draft.conditions.length === 0 ? (
                <p className="text-xs text-slate-400">No conditions — rule runs on every {draft.trigger || "trigger"}.</p>
              ) : draft.conditions.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-5" placeholder="path e.g. job.status" value={c.path} onChange={(e) => setCondition(i, { path: e.target.value })} />
                  <select className="col-span-3 h-10 rounded-md border border-slate-300 bg-white px-2" value={c.op} onChange={(e) => setCondition(i, { op: e.target.value })}>
                    {catalog.operators.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <Input className="col-span-3" placeholder="value" value={c.value ?? ""} onChange={(e) => setCondition(i, { value: e.target.value })} />
                  <button onClick={() => rmCondition(i)} className="col-span-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Actions</Label>
                <Button variant="outline" size="sm" onClick={addAction} data-testid="add-action-btn">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {draft.actions.length === 0 ? (
                <p className="text-xs text-slate-400">Add at least one action.</p>
              ) : draft.actions.map((a, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <select
                      value={a.type}
                      onChange={(e) => setAction(i, { type: e.target.value, config: a.config || {} })}
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium"
                    >
                      {catalog.actions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => rmAction(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea
                    className="w-full h-24 font-mono text-xs border border-slate-200 rounded-md p-2"
                    placeholder='{"title":"...", "message":"...", "route":"/jobs/{{job.id}}", "user_id":"{{actor.id}}"}'
                    value={JSON.stringify(a.config || {}, null, 2)}
                    onChange={(e) => {
                      try { setAction(i, { config: JSON.parse(e.target.value || "{}") }); }
                      catch { /* keep last valid */ }
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} /> Enabled
              </label>
              <Button onClick={saveDraft} data-testid="save-rule-btn">Save rule</Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No automation rules yet.</p>
              <Button className="mt-4" onClick={() => setDraft(EMPTY_RULE())}>Create your first rule</Button>
            </div>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 hover:bg-slate-50"
                   data-testid={`rule-row-${r.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${r.enabled ? "bg-green-500" : "bg-slate-300"}`} />
                    <div className="font-medium text-slate-900 truncate">{r.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{r.trigger}</span>
                  </div>
                  {r.description && <div className="text-sm text-slate-500 mt-0.5">{r.description}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    {r.conditions?.length || 0} condition(s) · {r.actions?.length || 0} action(s)
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => runTest(r)} data-testid={`test-rule-${r.id}`}>
                    <Play className="h-3 w-3 mr-1" /> Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(r)} data-testid={`toggle-rule-${r.id}`}>
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDraft(r)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
