import React from "react";
import { sendFreshSlipToCommand } from "./commandBridge";

const portalMoves = [
  {
    id: "quote",
    title: "Quote approval link",
    detail: "Customer reviews quote options and approves the work without a phone call.",
    route: "quotes",
    actionType: "approve_quote",
  },
  {
    id: "proof",
    title: "Proof Pack link",
    detail: "Customer sees before/after photos, worker notes, time and job summary after completion.",
    route: "jobs",
    actionType: "send_customer_message",
  },
  {
    id: "invoice",
    title: "Invoice/payment link",
    detail: "Customer gets the invoice after owner review. Payment status stays checked before marking paid.",
    route: "invoices",
    actionType: "review_invoice",
  },
  {
    id: "request",
    title: "New job request link",
    detail: "Customer requests another job and Churvox queues it for owner approval.",
    route: "leads",
    actionType: "owner_review",
  },
];

function sendPortalMoveToCommand(move, onNavigate) {
  sendFreshSlipToCommand({
    id: `portal-link-${move.id}-${Date.now()}`,
    group: "Portal Links",
    title: `${move.title} ready for owner review`,
    info: move.detail,
    urgency: move.id === "invoice" ? "High" : "Medium",
    found: "This customer-facing action belongs in an owner-approved link, not a manual copy-paste message.",
    prepared: `Build ${move.title.toLowerCase()} with clear wording, customer-safe details and no automatic send.`,
    why: "Customer-facing links affect trust, payments and expectations, so the owner stays in control.",
    owner: "Review the link, edit wording, approve sending, or open the source area.",
    area: "Portal Links",
    page: "portal",
    sourceType: "system",
    actionType: move.actionType,
  }, { type: "portal-link-review" });
  onNavigate?.("command");
}

export default function FreshPortal({ onNavigate }) {
  return (
    <section className="freshSmartPage freshPortalLinksPage">
      <header className="freshHero">
        <span>Portal Links</span>
        <h1>Customer links without losing owner control</h1>
        <p>Quotes, proof packs, invoices and new requests stay clean, customer-ready and owner approved.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>4</h2><p>customer link types</p></aside>
        <aside className="freshCard"><h2>Proof</h2><p>photos + notes</p></aside>
        <aside className="freshCard"><h2>Safe</h2><p>no auto-send</p></aside>
      </section>

      <section className="freshGrid">
        <article className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader">
            <div>
              <small>Customer flow</small>
              <h2>Job - proof - invoice - paid</h2>
            </div>
            <span className="ready">Owner approved</span>
          </div>

          <section className="freshStoryRail">
            <article className="done"><b>Quote</b><span>Customer approves scope and price.</span></article>
            <article className="done"><b>Job</b><span>Worker completes and adds proof.</span></article>
            <article className="open"><b>Proof Pack</b><span>Owner reviews photos and notes.</span></article>
            <article className="open"><b>Invoice</b><span>Draft invoice stays owner checked.</span></article>
            <article className="open"><b>Paid</b><span>Only after payment check confirms it.</span></article>
          </section>

          <section className="freshJobsDetailBox notes">
            <span>Rule</span>
            <p>Portal links make Churvox feel polished while the safety rules stay locked: no automatic invoice sends, no paid status changes, no tax filing, and no bank payout files.</p>
          </section>
        </article>

        <article className="freshCard">
          <h2>Customer links</h2>
          <div className="freshTimelineList">
            {portalMoves.map((move) => (
              <article key={move.id}>
                <b>{move.title}</b>
                <span>{move.detail}</span>
                <div className="freshActions" style={{ marginTop: 10 }}>
                  <button className="freshDark" type="button" onClick={() => sendPortalMoveToCommand(move, onNavigate)}>Send to Command</button>
                  <button className="freshGhost" type="button" onClick={() => onNavigate?.(move.route)}>Open area</button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="freshCard freshJobsActionsCard">
          <h2>Owner shortcuts</h2>
          <p className="freshJobsActionHint">Use these when you want the customer side to feel polished but still controlled.</p>
          <div className="freshActions freshJobsActionStack">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("quoteai")}>Build quote options</button>
            <button className="freshOrange" type="button" onClick={() => onNavigate?.("invoicecheck")}>Check invoice first</button>
            <button className="freshDark" type="button" onClick={() => onNavigate?.("jobs")}>Open Job Story</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
