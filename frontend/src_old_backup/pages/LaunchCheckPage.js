import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const STORAGE_KEY = "churvox_launch_check_v2";

const ROUTES = {
  login: "/login",
  jobs: "/jobs",
  createJob: "/jobs/new",
  clients: "/clients",
  createClient: "/clients/new",
  quotes: "/quotes",
  createQuote: "/quotes/new",
  invoices: "/invoices",
  createInvoice: "/invoices/new",
  team: "/team",
  workerJobs: "/worker/jobs",
  timesheets: "/timesheets",
  smartHub: "/smart-hub",
  reports: "/reports",
  sms: "/sms",
  integrations: "/integrations",
  automation: "/automation",
  automationRuns: "/automation/runs",
  plans: "/plans",
  settings: "/settings",
};

const checklistGroups = [
  { key: "AUTH", bucket: "core", items: [
    ["Owner login","Owner can log in and reach the app without errors.","login"],["Owner logout","Owner can log out and is returned safely to login.","login"],["Signup","New signup path loads and completes expected validation.","login"],["Forgot password","Forgot password flow accepts email and confirms request.","login"],["Reset password","Reset password form accepts valid token and updates password.","login"],["Bad token/session recovery","Expired/invalid token redirects safely and does not blank.","login"],
  ]},
  { key: "JOBS", bucket: "core", items: [["Jobs page loads","Jobs list renders without crash.","jobs"],["Create job","Job creation form opens and saves.","createJob"],["Open job detail","Job detail opens from list.","jobs"],["Edit job","Job edit saves updates.","jobs"],["Assign worker","Worker can be assigned to job.","jobs"],["Worker conflict warning if scheduled overlap exists","Overlap warning appears for conflicting schedules.","jobs"],["Start job","Job can be moved to started state.","jobs"],["Pause/resume job","Pause and resume actions behave correctly.","jobs"],["Complete job","Job can be marked complete.","jobs"],["Job status colors visible","Status colors are clear and readable.","jobs"],["Job pricing visible to owner/admin only","Pricing is hidden for non-authorized roles.","jobs"],["Invoice generation path visible","Invoice creation path is visible from job.","jobs"]]},
  { key: "CLIENTS", bucket: "core", items: [["Clients page loads","Clients list renders successfully.","clients"],["Create client","Client create form opens and saves.","createClient"],["Open client detail","Client detail opens correctly.","clients"],["Edit client","Client edit persists updates.","clients"],["Import client CSV","CSV import entry point is visible and usable.","clients"],["Client phone/email/address display correctly","Contact fields render correctly.","clients"]]},
  { key: "QUOTES", bucket: "money", items: [["Quotes page loads","Quotes list renders without crash.","quotes"],["Create quote","Quote creation works.","createQuote"],["Open quote detail","Quote detail opens.","quotes"],["Edit quote","Quote edits save.","quotes"],["Public quote link opens","Public quote URL opens and loads.","quotes"],["Public quote accept works if enabled","Accept action completes when enabled.","quotes"],["Public quote decline works if enabled","Decline action completes when enabled.","quotes"],["Quote follow-up path visible","Follow-up path is discoverable.","quotes"]]},
  { key: "INVOICES", bucket: "money", items: [["Invoices page loads","Invoices list renders.","invoices"],["Create invoice","Invoice create flow works.","createInvoice"],["Open invoice detail","Invoice detail opens.","invoices"],["Edit invoice if enabled","Edit path works where enabled.","invoices"],["Clear/delete invoice","Delete/clear action works with confirmation.","invoices"],["Public invoice link opens","Public invoice URL loads.","invoices"],["Pay Now link works if configured","Pay Now path behaves correctly when configured.","invoices"],["MYOB sync status visible if enabled","MYOB sync indicator is visible where enabled.","integrations"],["Payment status clear","Payment status is obvious and accurate.","invoices"]]},
  { key: "TEAM", bucket: "core", items: [["Team page loads","Team page renders with current users.","team"],["Invite worker","Worker invite can be sent in UI flow.","team"],["Invite manager","Manager invite flow is available.","team"],["Invite office admin","Office admin invite flow is available.","team"],["Invite payroll user","Payroll invite flow is available.","team"],["Update role","Role changes can be saved.","team"],["Remove worker","Worker removal flow is present and safe.","team"],["Import team CSV","Team CSV import entry point works.","team"],["Worker profile opens","Worker profile route opens.","team"],["Assign job from worker profile if built","Assignment action appears if feature exists.","team"]]},
  { key: "WORKER", bucket: "worker", items: [["Worker login","Worker account can authenticate.","login"],["Worker jobs page loads","Worker job list loads.","workerJobs"],["Worker opens job detail","Worker can open assigned job detail.","workerJobs"],["Worker acknowledges job","Acknowledge action works.","workerJobs"],["Worker starts job","Worker can start job.","workerJobs"],["Worker pauses/resumes job","Pause/resume works for worker.","workerJobs"],["Worker completes job","Worker can complete assigned job.","workerJobs"],["Worker uploads photo","Photo upload works if available.","workerJobs"],["Worker adds note if built","Note entry works if feature exists.","workerJobs"],["Worker cannot see pricing","Worker view hides pricing data.","workerJobs"],["Worker cannot see owner-only settings","Worker cannot access owner-only settings.","settings"],["Worker cannot see MYOB/payroll/plans","Worker cannot access MYOB/payroll/plans pages.","integrations"]]},
  { key: "PAYROLL / TIMESHEETS", bucket: "money", items: [["Timesheets page loads","Timesheets screen loads with no crash.","timesheets"],["Pay period selector works","Period selector updates dataset.","timesheets"],["Worker hours visible","Hours are visible and accurate.","timesheets"],["Approve timesheet","Approve action succeeds.","timesheets"],["Reject timesheet","Reject action succeeds.","timesheets"],["Payroll summary visible","Payroll summary data appears.","timesheets"],["Payroll CSV export works","CSV export produces expected file.","timesheets"],["Payroll role access restricted","Unauthorized roles are blocked.","timesheets"],["No bank/tax/government submission shown","No government submission controls appear.","timesheets"]]},
  { key: "SMART HUB", bucket: "automation", items: [["Smart Hub page loads","Smart Hub loads successfully.","smartHub"],["Sidebar visible","Navigation sidebar remains visible.","smartHub"],["Live metrics visible","Metric cards are rendered.","smartHub"],["AI assistant visible","Assistant panel appears.","smartHub"],["AI response readable","AI response formatting is readable.","smartHub"],["AI fallback works if provider missing","Fallback messaging appears when provider unavailable.","smartHub"],["Command shortcuts work","Shortcut actions trigger expected UI behavior.","smartHub"],["Approval-first notice visible","Approval warning/notice is visible.","smartHub"]]},
  { key: "REPORTS", bucket: "automation", items: [["Reports page loads","Reports page renders.","reports"],["Revenue cards visible","Revenue cards show values or empty state.","reports"],["Jobs snapshot visible","Jobs snapshot card is present.","reports"],["Quotes snapshot visible","Quotes snapshot card is present.","reports"],["Invoice snapshot visible","Invoice snapshot card is present.","reports"],["Team/payroll snapshot visible","Team/payroll snapshot appears.","reports"],["Top clients visible","Top clients section appears.","reports"],["Export invoices CSV","Invoices export action works.","reports"],["Export jobs CSV","Jobs export action works.","reports"],["Export quotes CSV","Quotes export action works.","reports"],["Export payroll CSV","Payroll export action works.","reports"],["Empty/error states work","Error/empty states render safely.","reports"]]},
  { key: "SMS", bucket: "automation", items: [["SMS page loads","SMS page renders.","sms"],["Credit balance visible","Credit balance visibility is correct.","sms"],["Credit packs visible","Credit packs are listed.","sms"],["Not configured state clear","Unconfigured provider state is clear.","sms"],["Template selector works","Template selection updates content.","sms"],["Recipient input works","Recipient field validates correctly.","sms"],["Message editor works","Message editing behaves correctly.","sms"],["Confirmation before send appears","Send confirmation gate appears.","sms"],["Send blocked/clear if provider missing","Provider-missing send state is explicit.","sms"],["SMS history visible","SMS history renders.","sms"]]},
  { key: "MYOB / INTEGRATIONS", bucket: "automation", items: [["Integrations page loads","Integrations screen renders.","integrations"],["MYOB status visible","MYOB connection status is visible.","integrations"],["Plan rules visible","Plan limitation guidance is visible.","plans"],["Company file settings save","Company file settings persist.","integrations"],["Test connection gives clear result","Connection test gives clear success/failure message.","integrations"],["Connect button does not open broken URL if not configured","Connect action is safely blocked when not configured.","integrations"],["Internal invoice note visible","Internal note guidance is shown.","integrations"],["Manual sync only notice visible","Manual-sync-only notice is shown.","integrations"],["Invoice detail MYOB panel visible if enabled","MYOB panel appears on invoice detail when enabled.","invoices"]]},
  { key: "AUTOMATION", bucket: "automation", items: [["Automation page loads","Automation page renders.","automation"],["Templates visible","Automation templates are displayed.","automation"],["Create rule from template","Template can seed a new rule.","automation"],["Rule builder validates fields","Rule builder validation prevents bad saves.","automation"],["Rules list visible","Rules list is visible.","automation"],["Edit rule","Existing rule can be edited.","automation"],["Pause/resume rule","Rule pause/resume works.","automation"],["Delete rule","Rule deletion flow is safe and works.","automation"],["Automation runs page loads","Automation runs page renders.","automationRuns"],["Failed run retry queues safe retry","Retry queues a controlled retry.","automationRuns"],["No auto-send SMS/email","No automatic message send occurs.","automation"],["No auto MYOB sync","No automatic MYOB sync occurs.","automation"],["No payroll auto-change","No payroll values auto-change.","automation"]]},
  { key: "MOBILE / PWA", bucket: "mobile", items: [["Mobile bottom nav visible","Bottom navigation is visible on small screens.","jobs"],["Sidebar/header not blocking taps","Layout chrome does not block taps.","jobs"],["Cards tappable","Cards are easy to tap on mobile.","jobs"],["Forms usable on mobile","Forms remain usable on narrow viewports.","jobs"],["Modals fit screen","Modals fit and scroll on mobile.","jobs"],["PWA install prompt appears if supported","Install prompt appears on supported devices.","jobs"],["Refresh/login does not blank","Refresh does not cause blank screen.","login"]]},
  { key: "DEPLOY / RENDER", bucket: "deploy", items: [["Frontend build passes","`npm --prefix frontend run build` passes.",null],["Backend compile passes","Python compile checks pass.",null],["GitHub check passes","CI status is green.",null],["Render deploy starts after push","Render deploy starts from latest push.",null],["Render deploy succeeds","Render reports successful deploy.",null],["Live site opens","Live production URL opens.",null],["Hard refresh works","Hard refresh loads app correctly.",null],["No blank screen after login","Post-login render is stable.","jobs"]]},
];

export default function LaunchCheckPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ checks: {}, notes: {}, last_updated: null });
  const [manualCopyText, setManualCopyText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("bad state");
      setState({
        checks: parsed.checks && typeof parsed.checks === "object" ? parsed.checks : {},
        notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
        last_updated: parsed.last_updated || null,
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setState({ checks: {}, notes: {}, last_updated: null });
    }
  }, []);

  const persist = (next) => {
    const withTime = { ...next, last_updated: new Date().toISOString() };
    setState(withTime);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTime));
  };

  const rows = useMemo(() => checklistGroups.flatMap((group) => group.items.map(([label, expected, route]) => ({ id: `${group.key}::${label}`, group: group.key, bucket: group.bucket, label, expected, route }))), []);
  const total = rows.length;
  const completed = rows.filter((row) => state.checks[row.id]).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  const bucketProgress = (bucket) => {
    const scoped = rows.filter((row) => row.bucket === bucket);
    const done = scoped.filter((row) => state.checks[row.id]).length;
    return scoped.length ? Math.round((done / scoped.length) * 100) : 0;
  };

  const barClass = progress === 100 ? "bg-green-600" : progress < 35 ? "bg-amber-500" : progress < 70 ? "bg-red-500" : "bg-blue-600";

  const buildSummary = () => {
    const incompleteByGroup = checklistGroups.map((group) => ({ group: group.key, items: group.items.map(([label]) => `${group.key}::${label}`).filter((id) => !state.checks[id]).map((id) => id.split("::")[1]) })).filter((group) => group.items.length);
    const noted = Object.entries(state.notes).filter(([, value]) => String(value || "").trim().length > 0);
    return [
      `Churvox Launch Check Summary`,
      `Timestamp: ${new Date().toISOString()}`,
      `Completion: ${progress}% (${completed}/${total})`,
      "",
      "Incomplete Items by Section:",
      ...incompleteByGroup.flatMap((section) => [`- ${section.group}:`, ...section.items.map((item) => `  - ${item}`)]),
      "",
      "Notes / Failure Notes:",
      ...(noted.length ? noted.map(([id, value]) => `- ${id}: ${value}`) : ["- None recorded"]),
    ].join("\n");
  };

  const handleCopySummary = async () => {
    const summary = buildSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setManualCopyText("");
    } catch {
      setManualCopyText(summary);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-black text-slate-950">Launch Check</h1>
            <p className="mt-2 text-slate-800">Work through every launch-critical flow before going live.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm text-slate-800">
              <div><span className="font-bold">Progress:</span> {progress}%</div><div><span className="font-bold">Completed:</span> {completed}</div><div><span className="font-bold">Total items:</span> {total}</div><div><span className="font-bold">Last updated:</span> {state.last_updated ? new Date(state.last_updated).toLocaleString() : "Not started"}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 border border-slate-300" onClick={() => { if (window.confirm("Reset the full launch checklist?")) { localStorage.removeItem(STORAGE_KEY); setState({ checks: {}, notes: {}, last_updated: null }); } }}>Reset checklist</button>
              <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={handleCopySummary}>Copy full summary</button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[ ["Overall progress", progress], ["Core app progress", bucketProgress("core")], ["Worker progress", bucketProgress("worker")], ["Money flow progress", bucketProgress("money")], ["Automation/integration progress", bucketProgress("automation")], ["Mobile/deploy progress", Math.round((bucketProgress("mobile") + bucketProgress("deploy")) / 2)]].map(([title, value]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-700">{title}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}%</p></div>)}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-5 w-full rounded-full bg-slate-100"><div className={`h-5 rounded-full ${barClass}`} style={{ width: `${progress}%` }} /></div>
          </section>

          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Test data reminder</h2>
            <p className="mt-1 text-slate-800">Seed test data before full launch testing.</p>
            <pre className="mt-3 rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-900">bash scripts/churvox_seed_launch_test_data.sh</pre>
            <ul className="mt-3 list-disc pl-6 text-sm text-slate-800"><li>Only run against intended test database.</li><li>Seed should not send SMS/email/MYOB/Stripe.</li></ul>
          </section>

          {manualCopyText ? <section className="rounded-3xl border border-red-200 bg-red-50 p-4"><p className="text-sm font-bold text-slate-900">Clipboard copy failed. Copy manually:</p><textarea className="mt-2 h-56 w-full rounded-xl border border-red-300 bg-white p-2 text-sm text-slate-900" value={manualCopyText} readOnly /></section> : null}

          {checklistGroups.map((group) => (
            <section key={group.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-slate-950">{group.key}</h3>
              <div className="mt-4 space-y-3">
                {group.items.map(([label, expected, route]) => {
                  const id = `${group.key}::${label}`;
                  return (
                    <div key={id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <label className="flex items-start gap-3 text-slate-900"><input type="checkbox" className="mt-1 h-4 w-4" checked={Boolean(state.checks[id])} onChange={() => persist({ ...state, checks: { ...state.checks, [id]: !state.checks[id] } })} /><span className="font-semibold">{label}</span></label>
                        {route && ROUTES[route] ? <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900" onClick={() => navigate(ROUTES[route])}>Go to route</button> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Expected:</span> {expected}</p>
                      <textarea value={state.notes[id] || ""} onChange={(e) => persist({ ...state, notes: { ...state.notes, [id]: e.target.value } })} placeholder="Optional note / failure note" className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900" rows={2} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
