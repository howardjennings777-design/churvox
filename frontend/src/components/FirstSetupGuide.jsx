import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { businessSettingsCompletion, loadBusinessSettings } from "../lib/businessSettings";
import "./FirstSetupGuide.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const DISMISSED_KEY = "churvox_first_setup_dismissed";
const MANUAL_KEY = "churvox_first_setup_manual_done";

function readManual() { try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || "{}"); } catch { return {}; } }
function saveManual(value) { try { localStorage.setItem(MANUAL_KEY, JSON.stringify(value)); } catch {} }
function listFrom(res, keys = []) { const data = res?.data ?? res; if (Array.isArray(data)) return data; for (const key of [...keys, "jobs", "clients", "customers", "workers", "team", "users", "actions", "data"]) if (Array.isArray(data?.[key])) return data[key]; return []; }
function planReady(user) { const plan = String(user?.plan || "").toLowerCase(); if (!plan || plan === "none") return false; if (user?.stripe_subscription_id || user?.subscription_status === "active") return true; if (!user?.trial_ends_at) return true; const end = new Date(user.trial_ends_at); return Number.isNaN(end.getTime()) || end >= new Date(); }
function trialText(user) { if (user?.stripe_subscription_id || user?.subscription_status === "active") return "Paid subscription active"; if (!user?.trial_ends_at) return "Trial date not set"; const end = new Date(user.trial_ends_at); if (Number.isNaN(end.getTime())) return "Trial date not readable"; const days = Math.ceil((end.getTime() - Date.now()) / 86400000); return days < 0 ? "Trial ended" : `${days} day${days === 1 ? "" : "s"} left`; }

export default function FirstSetupGuide({ mode = "float", force = false }) {
  const api = useApi();
  const { user, hasAppAccess } = useAuth();
  const location = useLocation();
  const [manual, setManual] = React.useState(readManual);
  const [dismissed, setDismissed] = React.useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [counts, setCounts] = React.useState({ clients: 0, jobs: 0, workers: 0, actions: 0 });
  const params = new URLSearchParams(location.search || "");
  const shouldShow = force || params.get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "true";

  React.useEffect(() => {
    let alive = true;
    async function run() {
      const next = { clients: 0, jobs: 0, workers: 0, actions: 0 };
      try { next.clients = listFrom(await api.get("/clients"), ["clients", "customers"]).length; } catch {}
      try { next.jobs = listFrom(await api.get("/jobs"), ["jobs"]).length; } catch {}
      try { next.workers = listFrom(await api.get("/team/workers"), ["workers", "team", "users"]).length; } catch {}
      try { next.actions = listFrom(await api.get("/ai/actions"), ["actions"]).length; } catch {}
      if (alive) setCounts(next);
    }
    run();
    return () => { alive = false; };
  }, [api]);

  const settings = loadBusinessSettings(user);
  const completion = businessSettingsCompletion(settings);
  const businessDone = completion.percent >= 65 || Boolean(settings.business_name && settings.email);
  const invoiceDone = Boolean(settings.invoice_prefix && settings.quote_prefix && settings.default_gst_rate && settings.default_invoice_due_days && settings.default_quote_expiry_days);
  const steps = [
    ["plan", "Choose plan / start trial", planReady(user), "/plans", planReady(user) ? "Plan access is active" : "Pick a plan first. App pages stay locked until access is active."],
    ["business", "Set business details", businessDone, "/settings-board", businessDone ? `Business setup is ${completion.percent}% complete` : "Add business name, address, phone, GST, trade and region."],
    ["invoice", "Invoice + quote settings", invoiceDone, "/settings-board", invoiceDone ? "Invoice and quote defaults are set" : "Set prefixes, GST, due days and quote expiry."],
    ["client", "Add first client", counts.clients > 0 || manual.client, "/clients-board", counts.clients ? `${counts.clients} client records found` : "Create the first client record."],
    ["job", "Add first job", counts.jobs > 0 || manual.job, "/jobs-board", counts.jobs ? `${counts.jobs} jobs found` : "Create a job with client, address, price and instructions."],
    ["worker", "Add first worker", counts.workers > 0 || manual.worker, "/team-board", counts.workers ? `${counts.workers} team members found` : "Invite a worker so dispatch and photos can be tested."],
    ["command", "Open Command approvals", counts.actions > 0 || manual.command, "/dashboard", counts.actions ? `${counts.actions} approval actions found` : "Save or approve one setup action."],
    ["install", "Install app", manual.install, "/settings-board", "Install Churvox as a PWA on phone/tablet."],
  ];
  const done = steps.filter((step) => step[2]).length;
  const percent = Math.round((done / steps.length) * 100);
  const toggle = (key) => { const next = { ...manual, [key]: !manual[key] }; setManual(next); saveManual(next); };
  const hide = () => { localStorage.removeItem(FIRST_SETUP_KEY); localStorage.setItem(DISMISSED_KEY, "true"); setDismissed(true); };
  const reopen = () => { localStorage.setItem(FIRST_SETUP_KEY, "true"); localStorage.removeItem(DISMISSED_KEY); setDismissed(false); };

  if (!force && dismissed && !shouldShow) return <button className="fsSmallButton" onClick={reopen}>Setup guide</button>;
  if (!force && !shouldShow && mode === "float") return null;

  return <section className={`fsGuide ${mode}`}><div className="fsHero"><span>First setup guide</span><h2>Get Churvox ready for real work.</h2><p>Plan first, business details, first client, first job, first worker, then Command approvals.</p></div><div className="fsBody"><p className="fsTrial"><b>Access:</b> {hasAppAccess ? "Allowed" : "Locked until plan/trial is active"} · <b>Trial:</b> {trialText(user)}</p><div className="fsProgress"><div><i style={{ width: `${percent}%` }} /></div><b>{done}/{steps.length} done</b></div><div className="fsSteps">{steps.map(([key, title, stepDone, href, copy], index) => <article key={key} className={stepDone ? "done" : ""}><em>{stepDone ? "✓" : index + 1}</em><div><strong>{title}</strong><p>{copy}</p></div><aside><Link to={href}>Open</Link><button onClick={() => toggle(key)}>{stepDone ? "Undo" : "Mark done"}</button></aside></article>)}</div><footer><Link to="/onboarding">Open full guide</Link><button onClick={hide}>Hide guide for now</button></footer></div></section>;
}
