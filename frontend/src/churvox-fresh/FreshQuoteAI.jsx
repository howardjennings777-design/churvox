import React from "react";
import { sendFreshSlipToCommand } from "./commandBridge";

export default function FreshQuoteAI({ onNavigate }) {
  const sendQuoteReview = () => {
    sendFreshSlipToCommand({
      id: `quote-ai-${Date.now()}`,
      group: "Quote AI",
      title: "Quote needs owner review",
      info: "Quote prep",
      urgency: "Medium",
      found: "A quote can be prepared from the job details, but the owner should review price and wording first.",
      prepared: "Draft quote review item prepared for Command.",
      why: "Quotes affect customer price and should stay owner-approved.",
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
        <p>Prepare quote drafts from job details, then send them to Command for owner approval.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>Quote flow</h2>
          <div className="freshItem"><b>Job details</b><span>Start from customer, site, scope, photos and notes.</span></div>
          <div className="freshItem"><b>Price review</b><span>Check labour, travel, materials and risk before sending.</span></div>
          <div className="freshItem"><b>Owner approval</b><span>Quote drafts should be reviewed before customers see them.</span></div>
        </article>

        <article className="freshCard">
          <h2>Useful actions</h2>
          <div className="freshItem"><b>Create quote</b><span>Open Quotes to build or edit a real quote.</span></div>
          <div className="freshItem"><b>Use Tell Churvox</b><span>Type the job details and let Churvox open the right next step.</span></div>
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
