import React, { useMemo } from "react";
import "./autopilotReplay.css";

export default function AutopilotReplay({ jobs = [], invoices = [], team = [], drafts = [], approvals = [] }) {
  const model = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const approved = approvals.filter((a) => a.mode === "approve").length;
    const waiting = drafts.length;
    const moneyRisk = invoices.filter((i) => String(i.status || "").toLowerCase() !== "paid").length;
    const activity = approvals.slice(0, 5);
    const tomorrowRisk = jobs.filter((j) => String(j.scheduled_date || "") > today && ["pending", "unassigned"].includes(String(j.status || "").toLowerCase())).length;
    return { approved, waiting, moneyRisk, activity, tomorrowRisk, prepared: drafts.length, busyCrew: team.filter((w) => Number(w.assigned_jobs_count || 0) > 4).length };
  }, [jobs, invoices, team, drafts, approvals]);

  if (!jobs.length && !invoices.length && !drafts.length && !approvals.length) {
    return <section className="autopilot-card"><h3>Autopilot Replay</h3><p>Churvox will build replay history as approvals and drafts are created.</p></section>;
  }

  return <section className="autopilot-card"><header><h3>Autopilot Replay</h3><span>Today’s replay</span><button onClick={() => window.location.reload()}>Refresh replay</button></header><div className="auto-grid"><article><b>{model.prepared}</b><small>AI prepared</small></article><article><b>{model.approved}</b><small>Owner approved</small></article><article><b>{model.waiting}</b><small>Waiting approval</small></article><article><b>{model.moneyRisk}</b><small>Money/risk found</small></article></div><article className="auto-feature"><strong>Recommended first move</strong><p>{model.waiting ? "Review waiting approvals first so critical actions can execute safely." : "No pending approvals. Keep monitoring active."}</p></article><article className="auto-timeline"><strong>Recent operator activity</strong>{model.activity.length ? model.activity.map((a, idx) => <p key={idx}>{a.title || "Action"} · {a.mode || "review"}</p>) : <p>No recent approval activity yet.</p>}</article><div className="auto-split"><article><strong>Tomorrow risk</strong><p>{model.tomorrowRisk} jobs may need owner review before schedule impact.</p></article><article><strong>Crew signal</strong><p>{model.busyCrew} workers carrying high assignment load.</p></article></div></section>;
}
