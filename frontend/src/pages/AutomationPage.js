import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Play, History, Sparkles, Search, Copy, Power, ArrowUp, ArrowDown, Download, Upload, BarChart3 } from "lucide-react";
import ActionForm from "@/components/automation/ActionForm";

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

const OP_HINTS = {
  equals: "exact match",
  not_equals: "anything except",
  in: "one of (comma-separated or array)",
  not_in: "none of",
  contains: "substring match",
  not_contains: "does not contain",
  exists: "any non-null value",
  not_exists: "field is missing",
  gt: "greater than (numeric)",
  gte: "greater than or equal (numeric)",
  lt: "less than (numeric)",
  lte: "less than or equal (numeric)",
  blank: "empty / null / 0-length",
  not_blank: "has any value",
  starts_with: "prefix match",
  ends_with: "suffix match",
  is_true: "truthy boolean",
  is_false: "falsy boolean",
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
  const [advancedIdx, setAdvancedIdx] = useState({}); // per-action advanced toggle
  const [stats, setStats] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [cat, rulesRes, statsRes] = await Promise.all([
      get("/automation/catalog"),
      get("/automation/rules"),
      get("/automation/stats"),
    ]);
    if (cat?.success) setCatalog(cat.data || {});
    if (rulesRes?.success) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
    if (statsRes?.success) setStats(statsRes.data || null);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

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
    setAdvancedIdx({});
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
    if (!draft.actions || draft.actions.length === 0) { toast.error("Add at least one action"); return; }
    const body = { ...draft };
    const res = draft.id
      ? await put(`/automation/rules/${draft.id}`, body)
      : await post("/automation/rules", body);
    if (res?.success) {
      toast.success(draft.id ? "Rule updated" : "Rule created");
      setDraft(null);
      setAdvancedIdx({});
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
    if (!window.confirm(`Delete rule "${r.name}"? This cannot be undone.`)) return;
    const res = await del(`/automation/rules/${r.id}`);
    if (res?.success) { toast.success("Rule deleted"); load(); }
  };

  const duplicate = async (r) => {
    const res = await post(`/automation/rules/${r.id}/duplicate`);
    if (res?.success) { toast.success("Duplicated — the copy is disabled until you review it."); load(); }
    else toast.error(res?.error || "Failed to duplicate");
  };

  const runTest = async (r) => {
    const res = await post(`/automation/rules/${r.id}/run-test`, { payload: {} });
    if (res?.success) {
      const run = res.data?.run;
      const bad = (run?.results || []).filter((x) => !x.ok).length;
      if (bad) toast.error(`Test: ${bad} action(s) failed — see run history`);
      else toast.success(`Test run: ${run?.status} · ${run?.results?.length || 0} action(s)`);
    } else {
      toast.error(res?.error || "Test failed");
    }
  };

  const addCondition = () => setDraft((d) => ({ ...d, conditions: [...d.conditions, { path: "", op: "equals", value: "" }] }));
  const setCondition = (i, patch) => setDraft((d) => ({ ...d, conditions: d.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  const rmCondition = (i) => setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, idx) => idx !== i) }));

  const addAction = () => setDraft((d) => ({ ...d, actions: [...d.actions, { type: "create_notification", config: {} }] }));
  const setAction = (i, patch) => setDraft((d) => ({ ...d, actions: d.actions.map((a, idx) => idx === i ? { ...a, ...patch } : a) }));
  const rmAction = (i) => {
    setDraft((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }));
    setAdvancedIdx((m) => { const n = { ...m }; delete n[i]; return n; });
  };
  const moveAction = (i, dir) => setDraft((d) => {
    const arr = [...d.actions];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...d, actions: arr };
  });

  const exportRule = async (r) => {
    const res = await get(`/automation/rules/${r.id}/export`);
    if (!res?.success) { toast.error(res?.error || "Export failed"); return; }
    const json = JSON.stringify(res.data, null, 2);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(r.name || "rule").replace(/[^\w-]+/g, "_")}.churvox-rule.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Rule exported");
    } catch {
      toast.error("Could not download file");
    }
  };

  const doImport = async () => {
    let body;
    try { body = JSON.parse(importText); }
    catch { toast.error("Not valid JSON"); return; }
    const res = await post("/automation/rules/import", body);
    if (res?.success) {
      toast.success("Rule imported — review & enable it");
      setShowImport(false);
      setImportText("");
      load();
    } else {
      toast.error(res?.error || "Import failed");
    }
  };

  // Plain-English preview of the current draft — helps users read the rule like a sentence.
  const draftSummary = useMemo(() => {
    if (!draft) return "";
    const trig = draft.trigger ? `${draft.trigger}`.replace(/_/g, " ") : "<trigger>";
    const mode = (draft.condition_mode || "all").toLowerCase() === "all" ? "and" : "or";
    const condPart = (draft.conditions || []).length === 0
      ? ""
      : " if " + draft.conditions
          .map((c) => `${c.path || "<path>"} ${c.op || "equals"}${["exists","not_exists","blank","not_blank","is_true","is_false"].includes(c.op) ? "" : ` "${c.value ?? ""}"`}`)
          .join(` ${mode} `);
    const actPart = (draft.actions || []).length === 0
      ? " do nothing yet"
      : ", then " + draft.actions.map((a) => (a.type || "action").replace(/_/g, " ")).join(" → ");
    return `When ${trig}${condPart}${actPart}.`;
  }, [draft]);

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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" /> Automations
            </h1>
            <p className="text-sm text-slate-500">Run actions automatically when events happen in Churvox.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={openTemplates} data-testid="open-templates-btn">
              <Sparkles className="h-4 w-4 mr-1" /> Templates
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} data-testid="open-import-btn">
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <Button variant="outline" asChild>
              <Link to="/automation/runs"><History className="h-4 w-4 mr-1" /> Run history</Link>
            </Button>
            <Button onClick={() => { setAdvancedIdx({}); setDraft(EMPTY_RULE()); }} data-testid="new-rule-btn">
              <Plus className="h-4 w-4 mr-1" /> New rule
            </Button>
          </div>
        </div>

        {/* Stats dashboard card */}
        {stats && (stats.rules?.total > 0 || stats.runs?.total > 0) && !draft && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5" data-testid="automation-stats-card">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Automation health</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatBlock label="Rules enabled" value={`${stats.rules?.enabled || 0}/${stats.rules?.total || 0}`} />
              <StatBlock label="Runs · 24h" value={stats.runs?.last_24h || 0} />
              <StatBlock label="Runs · 7d" value={stats.runs?.last_7d || 0} />
              <StatBlock label="Completed" value={stats.runs?.by_status?.completed || 0} tone="green" />
              <StatBlock label="Failed" value={stats.runs?.by_status?.failed || 0} tone={(stats.runs?.by_status?.failed || 0) > 0 ? "red" : "slate"} />
            </div>
            {Array.isArray(stats.recent_failures) && stats.recent_failures.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Recent failures</div>
                <div className="space-y-1">
                  {stats.recent_failures.slice(0, 3).map((f) => (
                    <Link
                      key={f.id}
                      to="/automation/runs"
                      className="block text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 hover:bg-red-100"
                    >
                      <span className="font-medium">{f.rule_name || f.trigger}</span>
                      {f.error && <span className="text-red-600 ml-1">· {String(f.error).slice(0, 80)}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import modal */}
        {showImport && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm" data-testid="import-panel">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" /> Import rule from JSON
              </h3>
              <button onClick={() => { setShowImport(false); setImportText(""); }} className="text-sm text-slate-500 hover:underline">Close</button>
            </div>
            <p className="text-xs text-slate-500 mb-2">Paste a <code className="font-mono">.churvox-rule.json</code> payload below. Imported rules are always disabled — enable after you review.</p>
            <textarea
              className="w-full h-40 font-mono text-xs border border-slate-200 rounded-md p-2"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"name":"...", "trigger":"...", "actions":[...]}'
              data-testid="import-textarea"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowImport(false); setImportText(""); }}>Cancel</Button>
              <Button onClick={doImport} disabled={!importText.trim()} data-testid="do-import-btn">Import rule</Button>
            </div>
          </div>
        )}

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
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm" data-testid="templates-panel">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Start from a template
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Pick a ready-made workflow — you can edit it before saving.</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-sm text-slate-500 hover:underline">Close</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => pickTemplate(t)}
                  className="text-left border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all group"
                  data-testid={`template-${t.key}`}
                >
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{t.trigger}</span>
                    <span className="text-[10px] text-slate-400">· {t.actions?.length || 0} action(s)</span>
                  </div>
                </button>
              ))}
              {templates.length === 0 && <div className="col-span-2 text-sm text-slate-500 text-center py-4">Loading...</div>}
            </div>
          </div>
        )}

        {/* Rule builder */}
        {draft && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" data-testid="rule-builder">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{draft.id ? "Edit rule" : "New rule"}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define a trigger, add optional conditions, and choose what should happen.</p>
              </div>
              <button onClick={() => { setDraft(null); setAdvancedIdx({}); }} className="text-sm text-slate-500 hover:underline">Cancel</button>
            </div>

            <div className="p-5 space-y-6">
              {/* Plain-English preview */}
              {(draft.trigger || draft.actions.length > 0) && (
                <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-transparent p-3">
                  <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold mb-0.5">Rule preview</div>
                  <div className="text-sm text-slate-800 leading-relaxed">{draftSummary}</div>
                </div>
              )}
              {/* Step 1 — basics */}
              <section className="space-y-3">
                <SectionHeader step="1" title="Basics" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Rule name</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Notify me on job completion"
                      data-testid="rule-name-input"
                    />
                  </div>
                  <div>
                    <Label>Trigger</Label>
                    <select
                      value={draft.trigger}
                      onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                      className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                      data-testid="rule-trigger-select"
                    >
                      <option value="">Select a trigger...</option>
                      {catalog.triggers.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Description <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="What this rule does"
                  />
                </div>
                {triggerPaths.length > 0 && (
                  <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold mb-1">Available tokens</div>
                    <div className="flex flex-wrap gap-1.5">
                      {triggerPaths.map((p) => (
                        <code key={p} className="inline-block px-1.5 py-0.5 rounded bg-white border border-blue-100 text-slate-700 font-mono text-[11px]">{`{{${p}}}`}</code>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Use these anywhere in conditions or action fields — they'll be replaced with real values at run time.
                    </p>
                  </div>
                )}
              </section>

              {/* Step 2 — conditions */}
              <section className="space-y-3">
                <SectionHeader
                  step="2"
                  title="Conditions"
                  subtitle={draft.conditions.length === 0
                    ? `No filters — this rule will run on every ${draft.trigger || "trigger"} event.`
                    : `Match ${draft.condition_mode === "all" ? "ALL" : "ANY"} of the ${draft.conditions.length} condition(s) below.`}
                  right={
                    <div className="flex items-center gap-2">
                      <select
                        value={draft.condition_mode}
                        onChange={(e) => setDraft({ ...draft, condition_mode: e.target.value })}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        aria-label="Condition mode"
                      >
                        <option value="all">Match all (AND)</option>
                        <option value="any">Match any (OR)</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={addCondition} data-testid="add-condition-btn">
                        <Plus className="h-3 w-3 mr-1" /> Add condition
                      </Button>
                    </div>
                  }
                />
                {draft.conditions.map((c, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-[11px] uppercase tracking-wide text-slate-500">Field path</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. job.status"
                          value={c.path}
                          onChange={(e) => setCondition(i, { path: e.target.value })}
                        />
                      </div>
                      <div className="col-span-7 sm:col-span-3">
                        <Label className="text-[11px] uppercase tracking-wide text-slate-500">Operator</Label>
                        <select
                          className="w-full h-10 mt-1 rounded-md border border-slate-300 bg-white px-2 text-sm"
                          value={c.op}
                          onChange={(e) => setCondition(i, { op: e.target.value })}
                        >
                          {catalog.operators.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <Label className="text-[11px] uppercase tracking-wide text-slate-500">Value</Label>
                        <Input
                          className="mt-1"
                          placeholder="value"
                          value={c.value ?? ""}
                          onChange={(e) => setCondition(i, { value: e.target.value })}
                          disabled={["exists", "not_exists", "blank", "not_blank", "is_true", "is_false"].includes(c.op)}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                        <button
                          onClick={() => rmCondition(i)}
                          className="h-10 w-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md"
                          aria-label="Remove condition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {OP_HINTS[c.op] && <p className="text-[11px] text-slate-400 mt-2">{OP_HINTS[c.op]}</p>}
                  </div>
                ))}
              </section>

              {/* Step 3 — actions */}
              <section className="space-y-3">
                <SectionHeader
                  step="3"
                  title="Actions"
                  subtitle={draft.actions.length === 0
                    ? "What should happen when this rule matches?"
                    : `${draft.actions.length} action(s) will run in order.`}
                  right={
                    <Button variant="outline" size="sm" onClick={addAction} data-testid="add-action-btn">
                      <Plus className="h-3 w-3 mr-1" /> Add action
                    </Button>
                  }
                />
                {draft.actions.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-amber-800">Add at least one action for this rule to do anything.</p>
                  </div>
                )}
                {draft.actions.map((a, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">{i + 1}</span>
                        <select
                          value={a.type}
                          onChange={(e) => {
                            setAction(i, { type: e.target.value, config: {} });
                            setAdvancedIdx((m) => ({ ...m, [i]: false }));
                          }}
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium"
                        >
                          {catalog.actions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveAction(i, -1)}
                          disabled={i === 0}
                          className="h-8 w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move up"
                          data-testid={`action-up-${i}`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveAction(i, 1)}
                          disabled={i === draft.actions.length - 1}
                          className="h-8 w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move down"
                          data-testid={`action-down-${i}`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => rmAction(i)}
                          className="h-8 w-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md"
                          aria-label="Remove action"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <ActionForm
                        type={a.type}
                        config={a.config}
                        onChange={(newCfg) => setAction(i, { config: newCfg })}
                        advanced={!!advancedIdx[i]}
                        setAdvanced={(v) => setAdvancedIdx((m) => ({ ...m, [i]: v }))}
                      />
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                <span className="font-medium">{draft.enabled ? "Enabled" : "Disabled"}</span>
                <span className="text-xs text-slate-400">{draft.enabled ? "— will run on matching events" : "— saved but won't run"}</span>
              </label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setDraft(null); setAdvancedIdx({}); }}>Cancel</Button>
                <Button onClick={saveDraft} data-testid="save-rule-btn">Save rule</Button>
              </div>
            </div>
          </div>
        )}

        {/* Rules list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No automation rules yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Save hours of manual work — let Churvox notify, log, or update things for you when events happen.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button variant="outline" onClick={openTemplates}>
                  <Sparkles className="h-4 w-4 mr-1" /> Browse templates
                </Button>
                <Button onClick={() => { setAdvancedIdx({}); setDraft(EMPTY_RULE()); }}>Create your first rule</Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No rules match your filters.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 hover:bg-slate-50/60"
                   data-testid={`rule-row-${r.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        r.enabled
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${r.enabled ? "bg-green-500" : "bg-slate-400"}`} />
                      {r.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <div className="font-medium text-slate-900 truncate">{r.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{r.trigger}</span>
                    {r.last_run_status && (
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.last_run_status] || "bg-slate-300"}`} />
                        last: {r.last_run_status} · {timeAgo(r.last_run_at)}
                      </span>
                    )}
                  </div>
                  {r.description && <div className="text-sm text-slate-500 mt-1">{r.description}</div>}
                  <div className="text-xs text-slate-400 mt-1.5">
                    {r.conditions?.length || 0} condition(s) · {r.actions?.length || 0} action(s) · {r.runs_count || 0} run(s)
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => runTest(r)} data-testid={`test-rule-${r.id}`}>
                    <Play className="h-3 w-3 mr-1" /> Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(r)} data-testid={`toggle-rule-${r.id}`}>
                    <Power className="h-3 w-3 mr-1" />
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setAdvancedIdx({}); setDraft(r); }}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => duplicate(r)} data-testid={`duplicate-rule-${r.id}`}>
                    <Copy className="h-3 w-3 mr-1" /> Duplicate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportRule(r)} data-testid={`export-rule-${r.id}`}>
                    <Download className="h-3 w-3 mr-1" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

function SectionHeader({ step, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <span className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">{step}</span>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function StatBlock({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70 font-semibold">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
