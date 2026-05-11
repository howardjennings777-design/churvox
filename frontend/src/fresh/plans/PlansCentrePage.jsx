import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./plansCentrePage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : clean + "/api";
})();

const PLANS = [
  { key: "solo", name: "Solo", price: 30, clients: "Up to 20 clients", crew: "Owner only", myob: "No MYOB" },
  { key: "team", name: "Team", price: 70, clients: "Up to 30 clients", crew: "Small crew", myob: "No MYOB" },
  { key: "pro", name: "Pro", price: 110, clients: "Up to 40 clients", crew: "Growing crew", myob: "Optional MYOB add-on", highlight: true },
  { key: "enterprise", name: "Enterprise", price: 240, clients: "Up to 50 clients", crew: "Enterprise scale", myob: "MYOB included" },
];

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function postJson(path, body) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const token = readToken();
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_BASE + "/" + String(path).replace(/^\/+/, ""), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: res.ok, status: res.status, payload };
}

export default function PlansCentrePage() {
  const [currentPlan, setCurrentPlan] = useState(localStorage.getItem("churvox_current_plan") || "");
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      try {
        const token = readToken();
        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = "Bearer " + token;
        const res = await fetch(API_BASE + "/billing/status", { headers, credentials: "include" });
        if (!res.ok) return;
        const payload = await res.json();
        const plan = payload?.plan || payload?.tier || payload?.subscription?.plan || "";
        if (mounted && plan) {
          const clean = String(plan).toLowerCase();
          setCurrentPlan(clean);
          localStorage.setItem("churvox_current_plan", clean);
        }
      } catch {
      }
    }
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  async function startTrial(planKey) {
    setBusy("trial-" + planKey);
    setStatusMessage("");
    try {
      const result = await postJson("/billing/start-trial", { plan: planKey, trial_days: 14 });
      if (result.ok) {
        localStorage.setItem("churvox_current_plan", planKey);
        setCurrentPlan(planKey);
        setStatusMessage("14-day trial started for " + planKey + ".");
      } else {
        throw new Error((result.payload && (result.payload.message || result.payload.detail || result.payload.error)) || "Trial is not configured yet.");
      }
    } catch (err) {
      localStorage.setItem("churvox_pending_billing_action", JSON.stringify({ type: "trial", plan: planKey, created_at: new Date().toISOString() }));
      setStatusMessage("Trial could not be started from backend yet. We saved this as a pending action on this device.");
    } finally {
      setBusy("");
    }
  }

  async function choosePlan(planKey) {
    setBusy("choose-" + planKey);
    setStatusMessage("");
    const endpoints = ["/stripe/create-checkout-session", "/billing/create-checkout-session", "/billing/checkout"];

    try {
      for (const endpoint of endpoints) {
        const result = await postJson(endpoint, { plan: planKey, source: "plans_page" });
        if (!result.ok) continue;
        const url = result?.payload?.url || result?.payload?.checkout_url || result?.payload?.session_url;
        if (url) {
          window.location.assign(url);
          return;
        }
        if (result?.payload?.sessionId && window.Stripe) {
          const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");
          if (stripe) {
            await stripe.redirectToCheckout({ sessionId: result.payload.sessionId });
            return;
          }
        }
      }

      localStorage.setItem("churvox_pending_billing_action", JSON.stringify({ type: "choose_plan", plan: planKey, created_at: new Date().toISOString() }));
      setStatusMessage("Checkout is not configured yet. We saved your plan choice as a pending billing action.");
    } catch {
      localStorage.setItem("churvox_pending_billing_action", JSON.stringify({ type: "choose_plan", plan: planKey, created_at: new Date().toISOString() }));
      setStatusMessage("Checkout is not ready yet. Your choice was saved locally so billing can finish setup.");
    } finally {
      setBusy("");
    }
  }

  const currentPlanLabel = useMemo(() => {
    const match = PLANS.find((p) => p.key === String(currentPlan).toLowerCase());
    return match ? match.name : "No active plan detected";
  }, [currentPlan]);

  return (
    <main className="plans-page">
      <section className="plans-hero">
        <p>PLANS CENTRE</p>
        <h1>Choose the right Churvox plan for your team.</h1>
        <span>Pick a plan, start a 14-day trial, and scale with SMS packs and extra Enterprise users as needed.</span>
      </section>

      <section className="plans-current">
        <strong>Current plan:</strong> <span>{currentPlanLabel}</span>
      </section>

      {statusMessage ? <section className="plans-status">{statusMessage}</section> : null}

      <section className="plans-grid">
        {PLANS.map((plan) => (
          <article key={plan.key} className={"plan-card" + (plan.highlight ? " is-highlight" : "") + (currentPlan === plan.key ? " is-current" : "") }>
            {plan.highlight ? <div className="plan-tag">Best for launch</div> : null}
            <h2>{plan.name}</h2>
            <p className="plan-price">${plan.price}<small>/month</small></p>
            <ul>
              <li>{plan.clients}</li>
              <li>{plan.crew}</li>
              <li>{plan.myob}</li>
            </ul>
            <div className="plan-actions">
              <button type="button" onClick={() => startTrial(plan.key)} disabled={busy.length > 0}>
                {busy === "trial-" + plan.key ? "Starting..." : "Start 14-day trial"}
              </button>
              <button type="button" className="outline" onClick={() => choosePlan(plan.key)} disabled={busy.length > 0}>
                {busy === "choose-" + plan.key ? "Loading..." : "Choose plan"}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="plans-addons">
        <article>
          <h3>SMS packs</h3>
          <p>100 credits = $10 · 500 credits = $45 · 1000 credits = $80</p>
          <Link to="/billing">Open Billing</Link>
        </article>
        <article>
          <h3>Enterprise user blocks</h3>
          <p>Add +50 users for $100 on Enterprise plans.</p>
          <Link to="/billing">Manage in Billing</Link>
        </article>
      </section>
    </main>
  );
}
