import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./demoModePage.css";

const DEMO_ACTIONS = [
  {
    type: "Worker assignment",
    title: "Assign lawn service job to Wiremu",
    reason: "Worker is active, closest to Naenae, and has the lowest job load today.",
    status: "Ready for owner approval",
    href: "/ai-approvals",
  },
  {
    type: "Invoice draft",
    title: "Create invoice draft for completed hedge trim",
    reason: "Worker completed the job and added proof notes/photos.",
    status: "Draft only — not sent",
    href: "/proof-to-paid",
  },
  {
    type: "Payment SMS",
    title: "Prepare reminder for overdue invoice",
    reason: "Invoice is still open and customer has a saved phone number.",
    status: "Editable SMS — not sent",
    href: "/ai-approvals",
  },
  {
    type: "Quote follow-up",
    title: "Follow up open quote from last week",
    reason: "Quote is still waiting for a customer decision.",
    status: "Draft message only",
    href: "/ai-approvals",
  },
];

const DEMO_STEPS = [
  "Open Smart Hub and see what AI found.",
  "Open AI Work Queue and review prepared work.",
  "Edit the message, invoice wording, worker or client details.",
  "Approve and save, or approve and send SMS when ready.",
  "Open Proof-to-Paid to turn completed jobs into draft invoices.",
  "Open Worker App to see the simple mobile field workflow.",
];

function saveDemoFlag(value) {
  try {
    localStorage.setItem("churvox_demo_mode", value ? "on" : "off");
    localStorage.setItem("churvox_owner_name", value ? "Demo Owner" : localStorage.getItem("churvox_owner_name") || "Owner");
  } catch {}
}

function readDemoFlag() {
  try {
    return localStorage.getItem("churvox_demo_mode") === "on";
  } catch {
    return false;
  }
}

export default function DemoModePage() {
  const [demoOn, setDemoOn] = useState(readDemoFlag);
  const prepared = useMemo(() => DEMO_ACTIONS.length, []);

  function toggleDemo() {
    const next = !demoOn;
    setDemoOn(next);
    saveDemoFlag(next);
  }

  return (
    <main className="demo-page">
      <section className="demo-hero">
        <div>
          <p>DEMO MODE</p>
          <h1>Show how Churvox runs the admin.</h1>
          <span>
            Use this page for testers, customers and demos. It explains the full story:
            AI finds the work, prepares it, then the owner edits and approves.
          </span>
        </div>
        <button type="button" onClick={toggleDemo}>
          {demoOn ? "Demo mode on" : "Turn on demo mode"}
        </button>
      </section>

      <section className="demo-stats">
        <article><b>{prepared}</b><small>AI-prepared actions</small></article>
        <article><b>3</b><small>Owner approval steps</small></article>
        <article><b>0</b><small>Customer actions without approval</small></article>
      </section>

      <section className="demo-board">
        <header>
          <div>
            <p>SELLING DEMO</p>
            <h2>What the owner sees</h2>
          </div>
          <Link to="/ai-approvals">Open AI Work Queue</Link>
        </header>

        <div className="demo-action-list">
          {DEMO_ACTIONS.map((action) => (
            <article className="demo-action" key={action.title}>
              <div>
                <span>{action.type}</span>
                <strong>{action.title}</strong>
                <p>{action.reason}</p>
                <small>{action.status}</small>
              </div>
              <Link to={action.href}>Open</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-walkthrough">
        <header>
          <p>HOW TO DEMO CHURVOX</p>
          <h2>Simple customer walkthrough</h2>
        </header>

        <div>
          {DEMO_STEPS.map((step, index) => (
            <article key={step}>
              <b>{index + 1}</b>
              <span>{step}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-links">
        <Link to="/dashboard">Open Smart Hub</Link>
        <Link to="/ai-approvals">Open AI Work Queue</Link>
        <Link to="/proof-to-paid">Open Proof-to-Paid</Link>
        <Link to="/worker">Open Worker App</Link>
      </section>
    </main>
  );
}
