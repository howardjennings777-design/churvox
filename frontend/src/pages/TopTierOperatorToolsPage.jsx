// CHURVOX_TOP_TIER_TOOLS_PAGE_20260528
// CHURVOX_OPERATOR_TOOLS_HUB_LINKS_20260528
// CHURVOX_OPERATOR_TOOLS_PROOF_PACK_LIST_20260528
// CHURVOX_OPERATOR_TOOLS_AUDIT_LIST_20260528
// CHURVOX_TOOLS_LAUNCH_CONTROL_LINK_20260528
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiAuditLog, getDispatchBoard, getTradePresets, listProofPacks, topTierFeatureList } from "../concept-c/churvoxTopTierApi";
import "./TopTierOperatorToolsPage.css";

const hubLinks = [
  ["/dashboard", "Command Floor", "Return to the main owner approval flow."],
  ["/launch-control", "Launch Control", "See the simple operating model and what each top-tier tool is for."],
  ["/message-approvals", "Message approvals", "Review drafted customer emails, SMS notes and follow-ups."],
  ["/dispatch-board", "Dispatch board", "See jobs across unassigned, assigned, in progress, review and invoice lanes."],
  ["/trade-presets", "Trade presets", "Shape job types, invoice wording and AI suggestions by trade."],
  ["/offline-sync", "Offline sync", "Check queued field notes and sync actions from worker devices."],
  ["/invoices", "Money desk", "Open invoices, draft records and payment follow-up."],
];

function proofLink(pack) {
  const token = pack?.public_token || pack?.token || pack?.proof_public_token || "";
  return token ? `/public/proof/${token}` : "";
}

function proofTitle(pack) {
  return pack?.job_title || pack?.title || pack?.customer_name || "Customer proof pack";
}

function niceDate(value) {
  if (!value) return "Time not recorded";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

function auditTitle(item) {
  return item?.action || item?.title || "Operator action";
}

function auditCopy(item) {
  return item?.note || item?.message || item?.target_type || "Action recorded in the AI Operator audit trail.";
}

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
  const recentProofPacks = state.proofPacks.slice(0, 6);
  const recentAudit = state.audit.slice(0, 8);

  return (
    <main className="tt-shell" data-version="CHURVOX_TOP_TIER_TOOLS_PAGE_20260528 CHURVOX_OPERATOR_TOOLS_HUB_LINKS_20260528 CHURVOX_OPERATOR_TOOLS_PROOF_PACK_LIST_20260528 CHURVOX_OPERATOR_TOOLS_AUDIT_LIST_20260528 CHURVOX_TOOLS_LAUNCH_CONTROL_LINK_20260528">
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

      <section className="tt-proof-panel">
        <header>
          <small>Customer proof packs</small>
          <h2>Recent proof packs</h2>
          <p>Open the customer-ready proof page prepared from completed work.</p>
        </header>
        <div className="tt-proof-list">
          {recentProofPacks.length ? recentProofPacks.map((pack, index) => {
            const href = proofLink(pack);
            const body = pack.ai_summary || pack.owner_message || pack.customer_name || "Prepared customer proof record.";
            return href ? (
              <a key={pack.id || pack._id || index} href={href} target="_blank" rel="noreferrer" className="tt-proof-row">
                <span><b>{proofTitle(pack)}</b><small>{body}</small></span><em>Open proof →</em>
              </a>
            ) : (
              <div key={pack.id || pack._id || index} className="tt-proof-row">
                <span><b>{proofTitle(pack)}</b><small>{body}</small></span><em>No public token yet</em>
              </div>
            );
          }) : <div className="tt-proof-empty">No proof packs yet. Open a Work Slip and tap Prepare proof pack.</div>}
        </div>
      </section>

      <section className="tt-proof-panel tt-audit-panel">
        <header>
          <small>AI audit trail</small>
          <h2>Recent operator activity</h2>
          <p>See what Churvox prepared, opened, reopened or logged for owner review.</p>
        </header>
        <div className="tt-proof-list">
          {recentAudit.length ? recentAudit.map((item, index) => (
            <div key={item.id || item._id || index} className="tt-proof-row tt-audit-row">
              <span><b>{auditTitle(item)}</b><small>{auditCopy(item)}</small></span>
              <em>{niceDate(item.created_at || item.createdAt || item.time)}</em>
            </div>
          )) : <div className="tt-proof-empty">No audit records yet. Work Slip actions will appear here once used.</div>}
        </div>
      </section>

      <section className="tt-grid tt-feature-grid">{topTierFeatureList.map((feature) => <article key={feature} className="tt-card"><small>Foundation</small><h2>{feature}</h2><p>Wired as part of the AI Operator system. Churvox prepares the admin; the owner stays in control.</p></article>)}</section>
      <section className="tt-grid"><article className="tt-card"><small>AI audit trail</small><h2>{state.audit.length} audit records</h2><p>Prepared actions, approvals, reopened slips, draft invoices and operator activity.</p></article><article className="tt-card"><small>Proof packs</small><h2>{state.proofPacks.length}</h2><p>Customer-ready proof records prepared from completed jobs.</p></article><article className="tt-card"><small>Dispatch board</small><h2>{laneCount}</h2><p>Jobs grouped into dispatch and review lanes.</p></article><article className="tt-card"><small>Trade presets</small><h2>{state.presets.length}</h2><p>Trade-specific wording and setup foundations.</p></article></section>
    </main>
  );
}
