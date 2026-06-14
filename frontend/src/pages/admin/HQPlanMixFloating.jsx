import React from "react";
import { useLocation } from "react-router-dom";
import API_BASE from "../../lib/apiBase";

const PLAN_BUCKETS = ["Start", "Crew", "Operator", "Command", "No plan", "Other"];
const TESTER_PLANS = [["operator", "Operator tester"], ["command", "Command tester"], ["crew", "Crew tester"], ["start", "Start tester"]];
const EMAIL_TEMPLATES = [["welcome", "Welcome"], ["trial_started", "Trial started"], ["setup_nudge", "Setup nudge"], ["trial_ending", "Trial ending"], ["payment_required", "Payment required"], ["tester_welcome", "Tester welcome"]];

function token() { try { return window.localStorage.getItem("token") || ""; } catch { return ""; } }
function headers() { return { Accept: "application/json", "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }; }
function money(value) { return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }); }

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
  const [open, setOpen] = React.useState(true);
  const [report, setReport] = React.useState(null);
  const [identifier, setIdentifier] = React.useState("");
  const [testerPlan, setTesterPlan] = React.useState("operator");
  const [testerDays, setTesterDays] = React.useState(30);
  const [emailTemplate, setEmailTemplate] = React.useState("welcome");
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
  const counts = report?.counts || {};
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <aside className="fixed bottom-5 left-5 z-[9998] w-[min(430px,calc(100vw-40px))] rounded-[26px] border border-orange-500/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-left">
          <span className="block text-xs font-black uppercase tracking-[0.16em] text-orange-200">HQ plans + testers</span>
          <b className="text-lg font-black">{total} users · {report?.paid_count || 0} paid · {report?.free_tester_count || 0} testers</b>
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200">{open ? "Hide" : "Show"}</button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3"><b className="block text-lg text-emerald-100">{report?.paid_count || 0}</b><span className="text-emerald-200">paid</span></div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3"><b className="block text-lg text-amber-100">{report?.trial_count || 0}</b><span className="text-amber-200">trials</span></div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3"><b className="block text-lg text-cyan-100">{report?.free_tester_count || 0}</b><span className="text-cyan-200">free testers</span></div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-sm font-black"><span className="text-slate-400">Paid MRR estimate</span><b className="float-right text-orange-200">{money(report?.monthly_revenue_estimate || 0)}</b></div>

          <div className="grid gap-2">
            {PLAN_BUCKETS.map((label) => {
              const count = Number(counts[label] || 0);
              const pct = total ? Math.round((count / total) * 100) : 0;
              return <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3"><div className="flex justify-between gap-3 text-sm font-black"><span>{label}</span><span className="text-orange-200">{count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><i className="block h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} /></div></div>;
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <b className="text-sm">Grant free tester access</b>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="email or user ID" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select value={testerPlan} onChange={(e) => setTesterPlan(e.target.value)} className="rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm font-black text-slate-950">{TESTER_PLANS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <input value={testerDays} onChange={(e) => setTesterDays(e.target.value)} type="number" min="1" max="365" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={grantTester} disabled={busy || !identifier} className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Grant free</button><button type="button" onClick={revokeTester} disabled={busy || !identifier} className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-40">Revoke</button></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <b className="text-sm">Lifecycle email</b>
            <select value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm font-black text-slate-950">{EMAIL_TEMPLATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" onClick={sendLifecycleEmail} disabled={busy || !identifier} className="mt-2 w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Send to entered user</button>
          </div>

          {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-black text-emerald-100">{message}</p> : null}
          {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-black text-red-100">{error}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}
