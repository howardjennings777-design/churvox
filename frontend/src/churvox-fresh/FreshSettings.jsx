import React from "react";

export default function FreshSettings({ onNavigate }) {
  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Settings</span>
        <h1>Settings</h1>
        <p>Business setup, GST, branding, email, accounting and security.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Settings list</h2>
          <div className="freshItem active">
            <b>Example record</b>
            <span>Ready for owner review</span>
          </div>
          <div className="freshItem need">
            <b>Needs attention</b>
            <span>Send to Command if risky</span>
          </div>
        </aside>

        <section className="freshCard">
          <h2>Settings workspace</h2>
          <p>This fresh page is wired and ready to be filled properly.</p>

          <label className="freshField">
            <span>Page status</span>
            <input value="Fresh placeholder active" readOnly />
          </label>

          <label className="freshField">
            <span>Owner note</span>
            <textarea value="Business setup, GST, branding, email, accounting and security." readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary">Save</button>
            <button className="freshOrange">Create</button>
            <button className="freshDark" onClick={() => onNavigate?.("command")}>Send to Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
