import React from "react";
import { useLocation } from "react-router-dom";
import API_BASE from "../../lib/apiBase";

const PLAN_BUCKETS = ["Start", "Crew", "Operator", "Command", "No plan", "Other"];
const TESTER_PLANS = [["operator", "Operator tester"], ["command", "Command tester"], ["crew", "Crew tester"], ["start", "Start tester"]];
const EMAIL_TEMPLATES = [
  ["welcome", "Welcome"],
  ["verify_email", "Verify email"],
  ["trial_started", "Trial started"],
  ["need_help_setup", "Need help setting up"],
  ["setup_nudge", "Finish setup"],
  ["first_client_nudge", "Add first client"],
  ["first_job_nudge", "Create first job"],
  ["first_invoice_nudge", "Create first invoice"],
  ["trial_checkin", "Trial check-in"],
  ["trial_ending_7", "Trial ending 7 days"],
  ["trial_ending_3", "Trial ending 3 days"],
  ["trial_ending_1", "Trial ending tomorrow"],
  ["payment_required", "Payment required"],
  ["payment_failed", "Payment failed"],
  ["paid_welcome", "Paid welcome"],
  ["upgrade_operator", "Upgrade to Operator"],
  ["dormant_7", "Dormant 7 days"],
  ["dormant_14", "Dormant 14 days"],
  ["dormant_30", "Dormant 30 days"],
  ["winback", "Win-back"],
  ["tester_welcome", "Tester welcome"],
  ["tester_feedback", "Tester feedback"],
];

function token() { try { return window.localStorage.getItem("token") || ""; } catch { return ""; } }
function headers() { return { Accept: "application/json", "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }; }
function money(value) { return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }); }
function customerOnly(items) { return (Array.isArray(items) ? items : []).filter((item) => item?.hq_record_type !== "internal"); }
function countByPlan(items) {
  const next = Object.fromEntries(PLAN_BUCKETS.map((label) => [label, 0]));
  customerOnly(items).forEach((item) => {
    const label = item?.plan_name === "Choose plan" ? "No plan" : (item?.plan_name || "Other");
    next[label in next ? label : "Other"] += 1;
  });
  return next;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `Request failed: ${res.status}`);
  return body;
}

async function apiPost(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", headers: headers(), body: JSON.stringify(payload || {}) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `Request failed: ${res.status}`);
  return body;
}

export default function HQPlanMixFloating() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [identifier, setIdentifier] = React.useState("");
  const [testerPlan, setTesterPlan] = React.useState("operator");
  const [testerDays, setTesterDays] = React.useState(30);
  const [emailTemplate, setEmailTemplate] = React.useState("need_help_setup");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const isHQ = ["/admin", "/owner/dashboard", "/platform-dashboard", "/app-owner"].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  const load = React.useCallback(async () => {
    if (!isHQ) return;
    try {
      setError("");
      const data = await apiGet("/api/admin/owner/plan-report");
      setReport(data);
    } catch (err) {
      setError(err?.message || "HQ plan report failed");
    }
  }, [isHQ]);

  React.useEffect(() => {
    if (!isHQ) return undefined;
    let alive = true;
    async function run() { if (alive) await load(); }
    run();
    const timer = window.setInterval(run, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [isHQ, load]);

  async function grantTester() {
    setBusy(true); setError(""); setMessage("");
    try {
      await apiPost("/api/admin/owner/grant-free-tester", { identifier, plan: testerPlan, days: Number(testerDays || 30), send_email: true });
      setMessage("Free tester access granted and tester email queued/sent.");
      await load();
    } catch (err) { setError(err?.message || "Could not grant tester access"); }
    finally { setBusy(false); }
  }

  async function revokeTester() {
    setBusy(true); setError(""); setMessage("");
    try {
      await apiPost("/api/admin/owner/revoke-free-tester", { identifier });
      setMessage("Free tester access revoked.");
      await load();
    } catch (err) { setError(err?.message || "Could not revoke tester access"); }
    finally { setBusy(false); }
  }

  async function sendLifecycleEmail() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiPost("/api/admin/owner/send-lifecycle-email", { identifier, template: emailTemplate });
      setMessage(result.email_sent ? `${emailTemplate} email sent.` : `${emailTemplate} email logged but provider did not send: ${result.error || "check Postmark env"}`);
    } catch (err) { setError(err?.message || "Could not send lifecycle email"); }
    finally { setBusy(false); }
  }

  if (!isHQ) return null;

  const reportUsers = [...customerOnly(report?.paid_users), ...customerOnly(report?.trial_users), ...customerOnly(report?.free_testers), ...customerOnly(report?.no_plan_users)];
  const counts = reportUsers.length ? countByPlan(reportUsers) : (report?.counts || {});
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  const paidCount = customerOnly(report?.paid_users).length || report?.paid_count || 0;
  const trialCount = customerOnly(report?.trial_users).length || report?.trial_count || 0;
  const testerCount = customerOnly(report?.free_testers).length || report?.free_tester_count || 0;
  const mrr = report?.monthly_revenue_estimate || 0;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-[9998] rounded-2xl border border-orange-500/40 bg-slate-950/95 px-4 py-3 text-left text-white shadow-2xl backdrop-blur">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">HQ plans</span>
        <b className="block text-sm font-black">{paidCount} paid · {trialCount} trials · {testerCount} testers</b>
      </button>
    );
  }

  return (
    <aside className="fixed bottom-5 left-5 z-[9998] max-h-[82vh] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-[24px] border border-orange-500/30 bg-slate-950/96 p-3 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">HQ retention drawer</span>
          <b className="block text-sm font-black">Plans, testers + save emails</b>
          <small className="text-xs font-bold text-slate-400">{total} customer records · {money(mrr)} paid MRR estimate</small>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200">Close</button>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2"><b className="block text-base text-emerald-100">{paidCount}</b><span className="text-emerald-200">paid</span></div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2"><b className="block text-base text-amber-100">{trialCount}</b><span className="text-amber-200">trials</span></div>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-2"><b className="block text-base text-cyan-100">{testerCount}</b><span className="text-cyan-200">testers</span></div>
        </div>

        <div className="grid gap-1.5">
          {PLAN_BUCKETS.map((label) => {
            const count = Number(counts[label] || 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2"><div className="flex justify-between gap-3 text-xs font-black"><span>{label}</span><span className="text-orange-200">{count}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"><i className="block h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} /></div></div>;
          })}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          <b className="text-sm">Grant tester access</b>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="email or user ID" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none" />
          <div className="mt-2 grid grid-cols-[1fr_76px] gap-2">
            <select value={testerPlan} onChange={(e) => setTesterPlan(e.target.value)} className="rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm font-black text-slate-950">{TESTER_PLANS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input value={testerDays} onChange={(e) => setTesterDays(e.target.value)} type="number" min="1" max="365" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={grantTester} disabled={busy || !identifier} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Grant</button><button type="button" onClick={revokeTester} disabled={busy || !identifier} className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-40">Revoke</button></div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          <b className="text-sm">Send retention email</b>
          <select value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm font-black text-slate-950">{EMAIL_TEMPLATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={sendLifecycleEmail} disabled={busy || !identifier} className="mt-2 w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Send email</button>
        </div>

        {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-black text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-black text-red-100">{error}</p> : null}
      </div>
    </aside>
  );
}
