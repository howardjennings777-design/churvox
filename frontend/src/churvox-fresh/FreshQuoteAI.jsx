import React from "react";
import { sendFreshSlipToCommand } from ".//* DISABLED_CONFLICT_commandBridge */";

export default function FreshQuoteAI({ onNavigate }) {
  const sendQuoteReview = () => {
    sendFreshSlipToCommand({
      id: `quote-ai-${Date.now()}`,
      group: "Quote AI",
      title: "Quote needs owner review",
      info: "Quote prep",
      urgency: "Medium",
      found: "Churvox builds the quote from the job details. The owner checks price and wording before the customer sees it.",
      prepared: "Quote review is ready in Command.",
      why: "Quotes affect customer price and stay owner-approved.",
      owner: "Review quote details, edit price, approve, or ignore for now.",
      area: "Quotes",
      page: "quoteai",
      sourceType: "quote_ai",
      actionType: "owner_review",
    }, { type: "quote-ai-review" });
    onNavigate?.("command");
  };

  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Quote AI</span>
        <h1>Quote AI</h1>
        <p>Build quote drafts from job details and send them to Command for owner approval.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>Quote flow</h2>
          <div className="freshItem"><b>Job details</b><span>Start from customer, site, scope, photos and notes.</span></div>
          <div className="freshItem"><b>Price review</b><span>Check labour, travel, materials and risk before sending.</span></div>
          <div className="freshItem"><b>Owner approval</b><span>Owner checks price and wording before the customer sees it.</span></div>
        </article>

        <article className="freshCard">
          <h2>Useful actions</h2>
          <div className="freshItem"><b>Create quote</b><span>Open Quotes to create or edit a quote.</span></div>
          <div className="freshItem"><b>Use Tell Churvox</b><span>Type the job details and Churvox opens the right next step.</span></div>
        </article>

        <aside className="freshCard">
          <h2>Open</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("quotes")}>Open quotes</button>
            <button className="freshOrange" type="button" onClick={() => onNavigate?.("askchurvox")}>Tell Churvox</button>
            <button className="freshDark" type="button" onClick={sendQuoteReview}>Send to Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
