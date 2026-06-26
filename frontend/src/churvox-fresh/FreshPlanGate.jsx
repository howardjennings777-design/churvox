import React from "react";
import { ACCOUNTING_ADDON_NAME, ACCOUNTING_ADDON_PRICE, GROWTH_PACK_NAME, GROWTH_PACK_PRICE, PLAN_LABELS, accessForPage } from "./planRules";
import "./freshPlanGate.css";

export default function FreshPlanGate({ page, user, onNavigate, children }) {
  const access = accessForPage(page, user);

  if (access.allowed) return children;

  const required = PLAN_LABELS[access.requiredPlan] || "a higher plan";
  const current = PLAN_LABELS[access.plan] || access.plan || "Start";
  const isAddon = access.addonRequired;

  return (
    <section className="freshPlanGate" aria-label="Plan access required">
      <header>
        <span>{isAddon ? "Add-on access" : "Tier access"}</span>
        <h1>{access.rule.area} is locked on {current}</h1>
        <p>{access.message} Your data stays safe — this only controls which Churvox tools are visible and usable on this tier.</p>
      </header>

      <section className="freshPlanGateCards">
        <article>
          <b>Current workspace</b>
          <strong>{current}</strong>
          <p>You can still use the tools included in your current sidebar and return to Command at any time.</p>
        </article>

        <article className="primary">
          <b>{isAddon ? ACCOUNTING_ADDON_NAME : "Unlock with"}</b>
          <strong>{isAddon ? ACCOUNTING_ADDON_PRICE : required}</strong>
          <p>{isAddon ? "Adds Xero or MYOB sync where available. Draft invoice sync only and owner-approved." : access.rule.reason}</p>
        </article>

        <article>
          <b>{GROWTH_PACK_NAME}</b>
          <strong>{GROWTH_PACK_PRICE}</strong>
          <p>Only for Command. Adds 50 active team members plus extra job, AI, automation and admin capacity.</p>
        </article>
      </section>

      <div className="freshPlanGateActions">
        <button type="button" onClick={() => onNavigate?.("plans")}>View Plans</button>
        <button type="button" onClick={() => onNavigate?.("command")}>Back to Command</button>
        <button type="button" onClick={() => onNavigate?.("support")}>Ask support</button>
      </div>
    </section>
  );
}
