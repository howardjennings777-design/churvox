import React from "react";
import "./trustQualityScores.css";

function label(score) { if (score >= 4) return "Strong"; if (score >= 2) return "Needs review"; return "Limited data"; }

export default function TrustQualityScores({ jobs = [], invoices = [], quotes = [], team = [] }) {
  const paid = invoices.filter((i) => String(i.status || "").toLowerCase() === "paid").length;
  const overdue = invoices.filter((i) => String(i.status || "").toLowerCase().includes("overdue")).length;

  return <section className="trust-card"><h3>Quality Signals</h3><div className="trust-grid">{team.slice(0, 8).map((w) => { const id = String(w.id || w._id || ""); const assigned = jobs.filter((j) => String(j.assigned_worker_id || j.worker_id || "") === id).length; const completed = jobs.filter((j) => String(j.assigned_worker_id || j.worker_id || "") === id && ["completed", "done"].includes(String(j.status || "").toLowerCase())).length; const overdueJobs = jobs.filter((j) => String(j.assigned_worker_id || j.worker_id || "") === id && String(j.status || "").toLowerCase().includes("overdue")).length; const signal = label(completed + (assigned ? 1 : 0)); return <article key={id || w.name}><strong>{w.name || "Worker"}</strong><p>Active assigned jobs: {assigned}</p><p>Completed jobs: {completed}</p><p>Incomplete/overdue: {overdueJobs}</p><p>Notes/proof signal: {w.notes_count || w.proof_count || "Limited data"}</p><span>{signal}</span></article>; })}</div><div className="client-card"><strong>Client trust cards</strong><p>Paid/Open/Overdue invoices: {paid}/{Math.max(invoices.length - paid - overdue, 0)}/{overdue}</p><p>Quote accepted/open/declined: {quotes.filter((q) => String(q.status || "").toLowerCase() === "accepted").length}/{quotes.filter((q) => String(q.status || "").toLowerCase() === "open").length}/{quotes.filter((q) => String(q.status || "").toLowerCase() === "declined").length}</p><p>Recurring/returning work signal: {label(paid)}</p></div></section>;
}
