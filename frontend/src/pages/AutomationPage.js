import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Play, History, Sparkles, Search } from "lucide-react";

const EMPTY_RULE = () => ({
  name: "",
  description: "",
  trigger: "",
  enabled: true,
  condition_mode: "all",
  conditions: [],
  actions: [],
});

const STATUS_DOT = {
  completed: "bg-green-500",
  failed: "bg-red-500",
  running: "bg-blue-500",
  skipped: "bg-slate-300",
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function AutomationPage() {
  const { get, post, put, del } = useApi();
  const [catalog, setCatalog] = useState({ triggers: [], actions: [], operators: [] });
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [triggerPaths, setTriggerPaths] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [cat, rulesRes] = await Promise.all([get("/automation/catalog"), get("/automation/rules")]);
    if (cat?.success) setCatalog(cat.data || {});
    if (rulesRes?.success) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  // Fetch schema for the currently-selected trigger so we can show path hints
  useEffect(() => {
    if (!draft?.trigger) { setTriggerPaths([]); return; }
    let alive = true;
    get(`/automation/triggers/${draft.trigger}/schema`).then((r) => {
      if (!alive) return;
      setTriggerPaths((r?.success && r?.data?.paths) || []);
    });
    return () => { alive = false; };
  }, [draft?.trigger, get]);

  const openTemplates = async () => {
    const r = await get("/automation/templates");
    setTemplates((r?.success && Array.isArray(r.data)) ? r.data : []);
    setShowTemplates(true);
  };

  const pickTemplate = (tpl) => {
    setShowTemplates(false);
    setDraft({
      name: tpl.name || "Untitled rule",
      description: tpl.description || "",
      trigger: tpl.trigger || "",
      enabled: true,
      condition_mode: tpl.condition_mode || "all",
      conditions: tpl.conditions || [],
      actions: tpl.actions || [],
    });
  };

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

  const duplicate = async (r) => {
    const res = await post(`/automation/rules/${r.id}/duplicate`);
    if (res?.success) { toast.success("Rule duplicated (disabled)"); load(); }
    else toast.error(res?.error || "Failed to duplicate");
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

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (triggerFilter && r.trigger !== triggerFilter) return false;
      if (enabledFilter === "enabled" && !r.enabled) return false;
      if (enabledFilter === "disabled" && r.enabled) return false;
      if (s && !(
        (r.name || "").toLowerCase().includes(s) ||
        (r.description || "").toLowerCase().includes(s) ||
        (r.trigger || "").toLowerCase().includes(s)
      )) return false;
      return true;
    });
  }, [rules, search, triggerFilter, enabledFilter]);

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
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={openTemplates} data-testid="open-templates-btn">
              <Sparkles className="h-4 w-4 mr-1" /> Templates
            </Button>
            <Button variant="outline" asChild>
              <Link to="/automation/runs"><History className="h-4 w-4 mr-1" /> Run history</Link>
            </Button>
            <Button onClick={() => setDraft(EMPTY_RULE())} data-testid="new-rule-btn">
              <Plus className="h-4 w-4 mr-1" /> New rule
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        {!draft && rules.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900"
                data-testid="rules-search"
              />
            </div>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
              data-testid="rules-trigger-filter"
            >
              <option value="">All triggers</option>
              {catalog.triggers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={enabledFilter}
              onChange={(e) => setEnabledFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
              data-testid="rules-enabled-filter"
            >
              <option value="">Any state</option>
              <option value="enabled">Enabled only</option>
              <option value="disabled">Disabled only</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {rules.length}</span>
          </div>
        )}

        {/* Templates picker */}
        {showTemplates && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3" data-testid="templates-panel">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Start from a template
              </h3>
              <button onClick={() => setShowTemplates(false)} className="text-sm text-slate-500 hover:underline">Close</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => pickTemplate(t)}
                  className="text-left border border-slate-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                  data-testid={`template-${t.key}`}
                >
                  <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">{t.trigger}</div>
                </button>
              ))}
              {templates.length === 0 && <div className="col-span-2 text-sm text-slate-500 text-center py-4">Loading...</div>}
            </div>
          </div>
        )}

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

            {/* Path hints for the current trigger */}
            {triggerPaths.length > 0 && (
              <div className="text-xs text-slate-500 border-l-2 border-blue-200 pl-3">
                <span className="font-medium text-slate-600">Available paths:</span>{" "}
                {triggerPaths.map((p) => (
                  <code key={p} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">{p}</code>
                ))}
                <div className="text-[11px] text-slate-400 mt-1">Use in conditions or inside action config values as <code className="font-mono">{"{{path}}"}</code>.</div>
              </div>
            )}

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
                    defaultValue={JSON.stringify(a.config || {}, null, 2)}
                    onBlur={(e) => {
                      try { setAction(i, { config: JSON.parse(e.target.value || "{}") }); }
                      catch { toast.error("Action config is not valid JSON"); }
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
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="outline" onClick={openTemplates}>
                  <Sparkles className="h-4 w-4 mr-1" /> Browse templates
                </Button>
                <Button onClick={() => setDraft(EMPTY_RULE())}>Create your first rule</Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No rules match your filters.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 hover:bg-slate-50"
                   data-testid={`rule-row-${r.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block h-2 w-2 rounded-full ${r.enabled ? "bg-green-500" : "bg-slate-300"}`} />
                    <div className="font-medium text-slate-900 truncate">{r.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{r.trigger}</span>
                    {r.last_run_status && (
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.last_run_status] || "bg-slate-300"}`} />
                        last: {r.last_run_status} · {timeAgo(r.last_run_at)}
                      </span>
                    )}
                  </div>
                  {r.description && <div className="text-sm text-slate-500 mt-0.5">{r.description}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    {r.conditions?.length || 0} condition(s) · {r.actions?.length || 0} action(s) · {r.runs_count || 0} run(s)
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => runTest(r)} data-testid={`test-rule-${r.id}`}>
                    <Play className="h-3 w-3 mr-1" /> Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(r)} data-testid={`toggle-rule-${r.id}`}>
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDraft(r)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => duplicate(r)} data-testid={`duplicate-rule-${r.id}`}>Duplicate</Button>
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
