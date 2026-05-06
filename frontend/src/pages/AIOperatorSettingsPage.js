import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Lock,
  Sparkles,
  Clock,
  Save,
  History,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const MODES = [
  {
    key: "approval_first",
    label: "Approval-first",
    desc: "Recommended. AI prepares everything, owner approves before execution.",
    color: "#155EEF",
    safe: true,
  },
  {
    key: "auto_safe",
    label: "Auto-run safe actions",
    desc: "AI auto-runs internal-only actions: drafts, reminders, proof packs, payroll review flags. Customer messages still need approval.",
    color: "#0d9488",
    safe: true,
  },
  {
    key: "auto_send",
    label: "Auto-send (advanced)",
    desc: "AI can also auto-send selected customer message categories below. Quiet hours and per-client limits respected. Approval-first remains for new clients and high-risk actions.",
    color: "#d97706",
    safe: false,
  },
];

const AUTO_SEND_CATEGORIES = [
  { key: "ai_auto_send_enabled", label: "Master auto-send enabled", desc: "Required ON for any auto-send below to work." },
  { key: "job_reminder_auto_send", label: "Appointment reminders", desc: "Day-before & day-of job reminders to clients." },
  { key: "on_the_way_auto_send", label: "On-the-way alerts", desc: "Alert client when worker is en route." },
  { key: "job_completed_update_auto_send", label: "Job completion messages", desc: "Send confirmation when job is marked complete." },
  { key: "quote_followup_auto_send", label: "Quote follow-ups", desc: "Auto-send polite follow-up on stale quotes." },
  { key: "invoice_reminder_auto_send", label: "Invoice reminders", desc: "Auto-send reminders for overdue invoices." },
  { key: "booking_confirmation_auto_send", label: "Booking confirmations", desc: "Confirm bookings created via receptionist." },
  { key: "internal_team_notification_auto_send", label: "Internal team nudges", desc: "Worker reminders & internal-only notifications." },
];

function Section({ title, icon, children, action }) {
  return (
    <section className="rounded-2xl border border-[#dde6f3] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-bold text-[#0d1b34]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, disabled, label, desc }) {
  return (
    <label className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${disabled ? "border-slate-200 bg-slate-50 opacity-70" : "border-[#dde6f3] bg-white hover:bg-[#f8fbff]"}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#0d1b34]">{label}</p>
        {desc ? <p className="mt-0.5 text-xs text-[#5b6c87]">{desc}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`mt-1 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition ${checked ? "bg-[#155EEF]" : "bg-slate-300"} ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch (_e) {
    return iso;
  }
}

export default function AIOperatorSettingsPage() {
  const { get, patch } = useApi();
  const [tab, setTab] = useState("operator");
  const [settings, setSettings] = useState(null);
  const [autoSend, setAutoSend] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [opRes, sendRes, setupRes, logsRes] = await Promise.all([
      get("/ai-operator/settings"),
      get("/ai-auto-send/settings"),
      get("/ai-operator/setup-status"),
      get("/ai-operator/audit-log?limit=100"),
    ]);
    if (opRes.success) setSettings(opRes.data?.settings || opRes.data || {});
    if (sendRes.success) setAutoSend(sendRes.data?.settings || {});
    if (setupRes.success) setSetupStatus(setupRes.data || {});
    if (logsRes.success) setLogs(safeArray(logsRes.data?.logs));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const updateAutoSend = (key, value) => {
    setAutoSend((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const saveOperator = async () => {
    if (!settings) return;
    setSaving(true);
    const res = await patch("/ai-operator/settings", settings);
    setSaving(false);
    if (res.success) {
      toast.success("Operator settings saved");
      setSettings(res.data?.settings || settings);
    } else {
      toast.error(res.error || "Failed to save");
    }
  };

  const saveAutoSend = async () => {
    if (!autoSend) return;
    setSaving(true);
    const res = await patch("/ai-auto-send/settings", autoSend);
    setSaving(false);
    if (res.success) {
      toast.success("Auto-send settings saved");
      setAutoSend(res.data?.settings || autoSend);
    } else {
      toast.error(res.error || "Failed to save");
    }
  };

  const currentMode = settings?.operator_mode || "approval_first";
  const isAutoSendMode = currentMode === "auto_send";
  const masterAutoSendOn = !!autoSend?.ai_auto_send_enabled;

  const setupBlocks = useMemo(() => {
    if (!setupStatus) return [];
    return [
      {
        key: "sms",
        label: "SMS (Clicksend)",
        ready: setupStatus.sms?.ready,
        msg: setupStatus.sms?.blocked_reason || `Provider: clicksend · Credits: ${setupStatus.sms?.credits ?? 0}`,
        link: "/sms",
        linkLabel: "Open SMS",
      },
      {
        key: "myob",
        label: "MYOB",
        ready: setupStatus.myob?.ready,
        msg: setupStatus.myob?.blocked_reason || "MYOB connected and ready for sync.",
        link: "/integrations",
        linkLabel: "Open Integrations",
      },
      {
        key: "ai",
        label: "AI / LLM",
        ready: setupStatus.ai?.ready,
        msg: setupStatus.ai?.blocked_reason || "AI key present.",
      },
    ];
  }, [setupStatus]);

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="cx-page-title flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-[#155EEF]" /> AI Operator
              </h1>
              <p className="cx-page-subtitle mt-1">
                Control how AI runs your business — what it can prepare, what it can auto-run, what stays approval-first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/ai-operator/approvals" className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50">
                <Sparkles className="h-4 w-4" /> Approvals queue
              </Link>
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> Reload
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 inline-flex rounded-lg border border-[#dde6f3] bg-white p-0.5 text-sm">
          {[
            { key: "operator", label: "Operator mode" },
            { key: "auto_send", label: "Auto-send categories" },
            { key: "setup", label: "Setup status" },
            { key: "audit", label: "Audit log" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md font-semibold ${tab === t.key ? "bg-[#155EEF] text-white" : "text-[#475569] hover:bg-slate-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 cx-loading-state">Loading…</div>
        ) : (
          <div className="mt-4 space-y-5">
            {tab === "operator" && (
              <>
                <Section title="Operator mode" icon={<ShieldCheck className="h-5 w-5 text-[#155EEF]" />} action={
                  <button
                    onClick={saveOperator}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                  </button>
                }>
                  <div className="grid gap-3">
                    {MODES.map((m) => {
                      const active = currentMode === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => updateSetting("operator_mode", m.key)}
                          className={`text-left rounded-xl border p-4 transition ${active ? "border-[#155EEF] bg-[#eff6ff]" : "border-[#dde6f3] bg-white hover:bg-slate-50"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold" style={{ color: active ? m.color : "#0d1b34" }}>{m.label}</p>
                              <p className="mt-1 text-xs text-[#5b6c87]">{m.desc}</p>
                            </div>
                            {active ? (
                              <span className="cx-status-badge cx-status-badge--blue">active</span>
                            ) : (
                              <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Quiet hours & limits" icon={<Clock className="h-5 w-5 text-[#0d9488]" />}>
                  <Toggle
                    checked={!!settings?.quiet_hours_enabled}
                    onChange={(v) => updateSetting("quiet_hours_enabled", v)}
                    label="Respect quiet hours"
                    desc="No customer messages sent during the window below."
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-[#94a3b8]">Quiet from</span>
                      <input
                        type="time"
                        className="cx-input mt-1 w-full"
                        value={settings?.quiet_hours_start || "20:00"}
                        onChange={(e) => updateSetting("quiet_hours_start", e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-[#94a3b8]">Quiet until</span>
                      <input
                        type="time"
                        className="cx-input mt-1 w-full"
                        value={settings?.quiet_hours_end || "07:30"}
                        onChange={(e) => updateSetting("quiet_hours_end", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-[#94a3b8]">Max messages per client per day</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      className="cx-input mt-1 w-32"
                      value={settings?.max_messages_per_client_per_day ?? 2}
                      onChange={(e) => updateSetting("max_messages_per_client_per_day", parseInt(e.target.value, 10) || 0)}
                    />
                  </label>
                  <Toggle
                    checked={!!settings?.require_approval_for_first_message}
                    onChange={(v) => updateSetting("require_approval_for_first_message", v)}
                    label="Require approval for first message to a new client"
                    desc="Even in auto-send mode, the first message to any client must be approved."
                  />
                  <Toggle
                    checked={!!settings?.owner_notify_on_action}
                    onChange={(v) => updateSetting("owner_notify_on_action", v)}
                    label="Notify owner when AI acts"
                    desc="In-app notification each time AI executes an auto-run or auto-send."
                  />
                </Section>

                <Section title="Locked safety rails" icon={<Lock className="h-5 w-5 text-[#dc2626]" />}>
                  <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#7f1d1d]">
                    These are always locked and cannot be auto-run by AI.
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#475569]">
                    {[
                      "Delete records (jobs, clients, invoices, quotes)",
                      "Charge cards or process payments",
                      "Submit tax / government filings",
                      "Destructive MYOB writes",
                      "Change payroll amounts",
                      "Remove users or change roles",
                      "Change billing plan",
                      "Change legal/compliance settings",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-[#dc2626] flex-shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}

            {tab === "auto_send" && (
              <Section
                title="Auto-send categories"
                icon={<Sparkles className="h-5 w-5 text-[#d97706]" />}
                action={
                  <button
                    onClick={saveAutoSend}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                  </button>
                }
              >
                {!isAutoSendMode ? (
                  <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-xs text-[#78350f]">
                    <p className="font-semibold">Auto-send mode is OFF.</p>
                    <p className="mt-1">These toggles only take effect when Operator mode is set to <strong>Auto-send (advanced)</strong>. Switch on the <em>Operator mode</em> tab to enable.</p>
                  </div>
                ) : null}
                {!setupStatus?.sms?.ready ? (
                  <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-xs text-[#78350f]">
                    <strong>SMS provider not connected.</strong> Real customer SMS sends are disabled until Clicksend API key is configured. AI can still draft, queue and preview SMS for owner approval.
                  </div>
                ) : null}
                {AUTO_SEND_CATEGORIES.map((c) => (
                  <Toggle
                    key={c.key}
                    checked={!!autoSend?.[c.key]}
                    onChange={(v) => updateAutoSend(c.key, v)}
                    label={c.label}
                    desc={c.desc}
                    disabled={c.key !== "ai_auto_send_enabled" && !masterAutoSendOn}
                  />
                ))}
              </Section>
            )}

            {tab === "setup" && (
              <Section title="Setup readiness" icon={<ShieldCheck className="h-5 w-5 text-[#155EEF]" />}>
                {setupBlocks.map((b) => (
                  <div
                    key={b.key}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#dde6f3] bg-white p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#0d1b34]">{b.label}</p>
                        <span className={b.ready ? "cx-status-badge cx-status-badge--green" : "cx-status-badge cx-status-badge--amber"}>
                          {b.ready ? "ready" : "setup required"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5b6c87]">{b.msg}</p>
                    </div>
                    {b.link ? (
                      <Link to={b.link} className="text-xs font-semibold text-[#155EEF] hover:underline whitespace-nowrap">
                        {b.linkLabel} →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </Section>
            )}

            {tab === "audit" && (
              <Section title="Audit log" icon={<History className="h-5 w-5 text-[#155EEF]" />}>
                {logs.length === 0 ? (
                  <div className="cx-empty-state-inline">
                    <AlertTriangle className="mx-auto h-6 w-6 text-[#94a3b8]" />
                    <p className="mt-2 text-sm font-semibold text-[#0d1b34]">No audit entries yet.</p>
                    <p className="mt-1 text-xs text-[#5b6c87]">Every approval, rejection and edit will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#e2e8f0]">
                    {logs.map((l) => (
                      <li key={l.id || l._id} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0d1b34]">
                              {String(l.event_type || "event").replace(/_/g, " ")}
                            </p>
                            <p className="mt-0.5 text-xs text-[#5b6c87] truncate">{l.message || "—"}</p>
                          </div>
                          <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">{formatTime(l.created_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
