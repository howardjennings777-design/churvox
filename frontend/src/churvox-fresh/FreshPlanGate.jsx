import React from "react";
import { ACCOUNTING_ADDON_NAME, ACCOUNTING_ADDON_PRICE, GROWTH_PACK_NAME, GROWTH_PACK_PRICE, PLAN_LABELS, accessForPage } from "./planRules";
import "./freshPlanGate.css";

export default function FreshPlanGate({ page, user, onNavigate, children }) {
  const access = accessForPage(page, user);

  if (access.allowed) return children;

  const required = PLAN_LABELS[access.requiredPlan] || "a higher plan";
  const isAddon = access.addonRequired;

  return (
    <section className="freshPlanGate">
      <header>
        <span>Plan access</span>
        <h1>{access.title}</h1>
        <p>{access.message}</p>
      </header>

      <section className="freshPlanGateCards">
        <article>
          <b>Your current tier</b>
          <strong>{PLAN_LABELS[access.plan] || access.plan || "Start"}</strong>
          <p>This area is not open on the current tier.</p>
        </article>

        <article>
          <b>{isAddon ? ACCOUNTING_ADDON_NAME : "Required plan"}</b>
          <strong>{isAddon ? ACCOUNTING_ADDON_PRICE : required}</strong>
          <p>{isAddon ? "Adds Xero or MYOB sync where available. Draft invoice sync only." : access.rule.reason}</p>
        </article>

        <article>
          <b>{GROWTH_PACK_NAME}</b>
          <strong>{GROWTH_PACK_PRICE}</strong>
          <p>Only for Command. Adds 50 active team members plus extra job, AI, automation and admin capacity.</p>
        </article>
      </section>

      <div className="freshPlanGateActions">
        <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
        <button type="button" onClick={() => onNavigate?.("command")}>Send to Command</button>
        <button type="button" onClick={() => onNavigate?.("support")}>Ask support</button>
      </div>
    </section>
  );
}
