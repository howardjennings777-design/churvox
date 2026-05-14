import React, { useState } from "react";
import "./FreshAuthShell.css";

const previewItems = [
  ["Unassigned job found", "Northside leak repair has no worker assigned.", "Ready for approval", "Approve"],
  ["Best worker recommended", "AI matched T. Wilson by skills, location and availability.", "Review", "Review"],
  ["Invoice draft prepared", "Job #4932 completed. Draft invoice ready with notes.", "Ready for approval", "Approve"],
  ["Quote follow-up ready", "2 quotes are cooling. Follow-up message drafted.", "Review", "Approve"],
  ["Overdue invoice reminder drafted", "$1,420 invoice overdue by 6 days. Reminder prepared.", "Ready", "Approve"],
];

const featurePills = ["Smart Hub", "AI Work Queue", "Jobs", "Clients", "Team", "Quotes", "Invoices", "Time tracking", "Worker app", "Proof-to-paid workflow"];

export default function FreshAuthShell({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const activeSubmit = mode === "login" ? onLogin : onSignup;

  return (
    <div className="fresh-auth-shell">
      <div className="fresh-auth-bg" />
      <header className="fresh-auth-header">
        <div className="brand">
          <span className="brand-mark">CX</span>
          <div>
            <strong>Churvox</strong>
            <p>AI Operator for service businesses</p>
          </div>
        </div>
        <button className="ghost-btn" onClick={() => setMode("login")}>Open app</button>
      </header>

      <main className="fresh-auth-main">
        <section className="hero">
          <span className="kicker">AI OPERATOR OS FOR TRADIES</span>
          <h1>AI runs the admin. You approve the work.</h1>
          <p>
            Churvox is where jobs, clients, workers, quotes and invoices flow into one calm command centre.
            AI checks what needs doing, prepares actions, and puts them in an approval queue so owners stay in control.
          </p>
          <div className="cta-row">
            <button className="primary-btn" onClick={() => setMode("login")}>Login / Open Churvox</button>
            <a className="ghost-btn" href="#how-churvox-works">See how AI works</a>
          </div>

          <div className="preview-grid" aria-label="AI Operator preview">
            {previewItems.map(([title, body, status, action]) => (
              <article key={title}>
                <div>
                  <h4>{title}</h4>
                  <p>{body}</p>
                </div>
                <footer>
                  <span>{status}</span>
                  <button type="button">{action}</button>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <aside className="auth-panel">
          <h3>{mode === "login" ? "Welcome back" : "Create your workspace"}</h3>
          <p>{mode === "login" ? "Sign in to your AI command centre." : "Start with owner access. Team invites come later."}</p>
          <div className="switch-row">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          {activeSubmit}
        </aside>
      </main>

      <section id="how-churvox-works" className="how-it-works">
        {[
          "Jobs, clients, workers and invoices come into Churvox",
          "AI checks what needs doing",
          "AI prepares the action",
          "Owner approves"
        ].map((step, i) => <div key={step}><b>{i + 1}</b><p>{step}</p></div>)}
      </section>

      <section className="feature-proof">
        {featurePills.map((item) => <span key={item}>{item}</span>)}
      </section>
    </div>
  );
}
