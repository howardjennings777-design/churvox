// CHURVOX_TOP_TIER_TOOLS_PAGE_20260528
// CHURVOX_OPERATOR_TOOLS_HUB_LINKS_20260528
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiAuditLog, getDispatchBoard, getTradePresets, listProofPacks, topTierFeatureList } from "../concept-c/churvoxTopTierApi";
import "./TopTierOperatorToolsPage.css";

const hubLinks = [
  ["/dashboard", "Command Floor", "Return to the main owner approval flow."],
  ["/message-approvals", "Message approvals", "Review drafted customer emails, SMS notes and follow-ups."],
  ["/dispatch-board", "Dispatch board", "See jobs across unassigned, assigned, in progress, review and invoice lanes."],
  ["/trade-presets", "Trade presets", "Shape job types, invoice wording and AI suggestions by trade."],
  ["/offline-sync", "Offline sync", "Check queued field notes and sync actions from worker devices."],
  ["/invoices", "Money desk", "Open invoices, draft records and payment follow-up."],
];

export default function TopTierOperatorToolsPage() {
  const [state, setState] = useState({ loading: true, error: "", audit: [], proofPacks: [], presets: [], lanes: {} });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [audit, proof, presets, dispatch] = await Promise.allSettled([getAiAuditLog(), listProofPacks(), getTradePresets(), getDispatchBoard()]);
        if (!alive) return;
        setState({ loading: false, error: "", audit: audit.status === "fulfilled" ? audit.value.items || [] : [], proofPacks: proof.status === "fulfilled" ? proof.value.items || [] : [], presets: presets.status === "fulfilled" ? presets.value.presets || [] : [], lanes: dispatch.status === "fulfilled" ? dispatch.value.lanes || {} : {} });
      } catch (err) {
        if (alive) setState((prev) => ({ ...prev, loading: false, error: err?.message || "Could not load operator tools" }));
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const laneCount = useMemo(() => Object.values(state.lanes || {}).reduce((total, lane) => total + (Array.isArray(lane) ? lane.length : 0), 0), [state.lanes]);

  return (
    <main className="tt-shell" data-version="CHURVOX_TOP_TIER_TOOLS_PAGE_20260528 CHURVOX_OPERATOR_TOOLS_HUB_LINKS_20260528">
      <section className="tt-hero">
        <div>
          <p>AI OPERATOR TOOLS</p>
          <h1>Top-tier control room</h1>
          <span>Proof packs, audit trail, client memory, dispatch lanes, trade presets and offline worker safety are now part of the Churvox system.</span>
        </div>
        <aside><small>Status</small><b>{state.loading ? "Loading" : "Ready"}</b><em>{state.error || "Approval-first tools"}</em></aside>
      </section>

      <section className="tt-hub-grid" aria-label="Operator tool shortcuts">
        {hubLinks.map(([href, title, copy]) => (
          <Link key={href} to={href} className="tt-hub-card">
            <small>Open</small>
            <h2>{title}</h2>
            <p>{copy}</p>
            <b>Go →</b>
          </Link>
        ))}
      </section>

      <section className="tt-grid tt-feature-grid">{topTierFeatureList.map((feature) => <article key={feature} className="tt-card"><small>Foundation</small><h2>{feature}</h2><p>Wired as part of the AI Operator system. Churvox prepares the admin; the owner stays in control.</p></article>)}</section>
      <section className="tt-grid"><article className="tt-card"><small>AI audit trail</small><h2>{state.audit.length} audit records</h2><p>Prepared actions, approvals, reopened slips, draft invoices and operator activity.</p></article><article className="tt-card"><small>Proof packs</small><h2>{state.proofPacks.length}</h2><p>Customer-ready proof records prepared from completed jobs.</p></article><article className="tt-card"><small>Dispatch board</small><h2>{laneCount}</h2><p>Jobs grouped into dispatch and review lanes.</p></article><article className="tt-card"><small>Trade presets</small><h2>{state.presets.length}</h2><p>Trade-specific wording and setup foundations.</p></article></section>
    </main>
  );
}
