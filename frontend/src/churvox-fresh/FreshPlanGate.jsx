import React from "react";
import { ACCOUNTING_ADDON_NAME, ACCOUNTING_ADDON_PRICE, GROWTH_PACK_NAME, GROWTH_PACK_PRICE, PLAN_LABELS, accessForPage } from "./planRules";
import "./freshPlanGate.css";

export default function FreshPlanGate({ page, user, onNavigate, children }) {
  const access = accessForPage(page, user);

  if (access.allowed) return children;

  const required = PLAN_LABELS[access.requiredPlan] || "a higher plan";
  const current = PLAN_LABELS[access.plan] || access.plan || "Start";
  const isAddon = access.addonRequired;
  const isCommand = String(page || "").toLowerCase() === "command";
  const isPayroll = String(page || "").toLowerCase() === "payroll";
  const plainReason = isCommand
    ? "Command is the approval desk where Churvox prepares admin from job proof, then asks the owner to approve, edit or park it."
    : isPayroll
      ? "Payroll summaries unlock once worker time and proof are part of the workflow."
      : access.rule.reason;

  return (
    <section className="freshPlanGate" aria-label="Plan access required">
      <header>
        <span>{isAddon ? "Add-on access" : "Plan locked"}</span>
        <h1>{access.rule.area} is not in {current}</h1>
        <p>This page is not broken. Churvox keeps the app simple by only showing the tools that belong in your plan. {plainReason}</p>
      </header>

      <section className="freshPlanGateCards">
        <article>
          <b>Current workspace</b>
          <strong>{current}</strong>
          <p>You can still use the tools in your sidebar. Start stays focused on jobs, clients, recurring work, quotes and invoices.</p>
        </article>

        <article className="primary">
          <b>{isAddon ? ACCOUNTING_ADDON_NAME : "Unlock with"}</b>
          <strong>{isAddon ? ACCOUNTING_ADDON_PRICE : required}</strong>
          <p>{isAddon ? "Adds Xero draft invoice sync where available. Owner approval stays required." : plainReason}</p>
        </article>

        <article>
          <b>{GROWTH_PACK_NAME}</b>
          <strong>{GROWTH_PACK_PRICE}</strong>
          <p>Only for Command. Adds 50 active team members plus extra job, AI, automation and admin capacity.</p>
        </article>
      </section>

      <div className="freshPlanGateActions">
        <button type="button" onClick={() => onNavigate?.("plans")}>View Plans</button>
        <button type="button" onClick={() => onNavigate?.("planday")}>Back to Smart Hub</button>
        <button type="button" onClick={() => onNavigate?.("support")}>Ask support</button>
      </div>
    </section>
  );
}
