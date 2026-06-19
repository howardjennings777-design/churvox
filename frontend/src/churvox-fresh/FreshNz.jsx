import React from "react";

export default function FreshNz({ onNavigate }) {
  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>NZ setup</span>
        <h1>New Zealand business settings</h1>
        <p>Keep NZ basics clear: GST wording, invoice defaults, local support, and accounting sync safety.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>NZ checks</h2>
          <div className="freshItem"><b>GST</b><span>Use your business GST settings and invoice defaults from Settings.</span></div>
          <div className="freshItem"><b>Invoices</b><span>Invoices stay draft/review-first until the owner approves.</span></div>
          <div className="freshItem"><b>Accounting</b><span>Xero or MYOB sync stays owner-controlled and review-first.</span></div>
        </article>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("settings")}>Open settings</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("invoices")}>Open invoices</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("xero")}>Open Xero</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
