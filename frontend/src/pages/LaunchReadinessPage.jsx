// CHURVOX_LAUNCH_READINESS_PAGE_20260528
import React from "react";
import { Link } from "react-router-dom";
import "./LaunchReadinessPage.css";

const essentials = [
  ["Command Floor", "Owner approval flow for work, invoices, messages, issues and crew decisions.", "/dashboard"],
  ["Work Slips", "Full-screen owner review flow where Churvox prepares the admin and owner approves.", "/dashboard"],
  ["Proof Packs", "Customer-ready proof pages from completed work.", "/operator-tools"],
  ["Message Approvals", "Prepared customer messages stay approval-first and logged.", "/message-approvals"],
  ["Dispatch", "Jobs grouped by lane so crew gaps are easier to see.", "/dispatch-board"],
  ["Offline Sync", "Worker notes can queue on device and sync back later.", "/offline-sync"],
  ["Trade Presets", "Trade-specific job wording and invoice wording starter flows.", "/trade-presets"],
  ["Public Documents", "Invoices, quotes and proof packs have customer-ready print/copy actions.", "/invoices"],
];

const nextOperatorMoves = [
  "Use Tools for proof packs, message approvals, dispatch, presets and offline sync.",
  "Use Command Floor as the main daily owner approval screen.",
  "Use Work Slips for approve, edit, proof pack, audit and client memory decisions.",
  "Keep customer sending approval-first from source records.",
];

export default function LaunchReadinessPage() {
  return (
    <main className="clr-shell" data-version="CHURVOX_LAUNCH_READINESS_PAGE_20260528">
      <section className="clr-hero">
        <div>
          <p>LAUNCH CONTROL</p>
          <h1>Churvox is now shaped around one clean operating model.</h1>
          <span>Crew finishes work. Churvox prepares the admin. Owner opens a Work Slip, checks it, adjusts if needed, then approves.</span>
        </div>
        <aside>
          <small>Main flow</small>
          <b>Approval-first</b>
          <em>No customer message, proof, invoice or quote should be trusted blindly. The owner stays in control.</em>
        </aside>
      </section>

      <section className="clr-grid">
        {essentials.map(([title, copy, href]) => (
          <Link key={title} to={href} className="clr-card">
            <small>Ready area</small>
            <h2>{title}</h2>
            <p>{copy}</p>
            <b>Open →</b>
          </Link>
        ))}
      </section>

      <section className="clr-panel">
        <div>
          <small>How to run it</small>
          <h2>Keep the product simple for owners.</h2>
          <p>The owner should not hunt through ten pages. Command Floor and Work Slips do the daily work. Tools holds the power features.</p>
        </div>
        <ul>
          {nextOperatorMoves.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <footer className="clr-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open Tools</Link>
      </footer>
    </main>
  );
}
