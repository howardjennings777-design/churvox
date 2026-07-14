import React, { useEffect, useMemo, useState } from "react";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { buildMoneyRadar, moneyLabel, numberValue, signatureOwnerRoute, useOfficeTeamSignatureData } from "./OfficeTeamSignatureData";
import "./OfficeTeamSignatureFlows.css";

const FILTERS = [
  ["all", "All money"],
  ["uninvoiced", "Not invoiced"],
  ["draft", "Draft invoices"],
  ["overdue", "Overdue"],
  ["risk", "Job risk"],
  ["quotes", "Quote follow-up"],
];

export default function OfficeTeamMoneyRadar({ appMode = "lab", go = () => {} }) {
  const ownerRoute = signatureOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const snapshot = useOfficeTeamSignatureData({ allowFallback });
  const radar = useMemo(() => buildMoneyRadar(snapshot), [snapshot]);
  const [filter, setFilter] = useState("all");
  const visibleItems = useMemo(() => radar.reviewItems.filter((item) => matchesFilter(item, filter)), [filter, radar.reviewItems]);
  const [selectedId, setSelectedId] = useState("");
  const selected = visibleItems.find((item) => item.id === selectedId) || visibleItems[0] || radar.reviewItems[0] || null;
  const [bufferTarget, setBufferTarget] = useState("2500");
  const [ownerNote, setOwnerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!visibleItems.length) {
      setSelectedId("");
      return;
    }
    if (!visibleItems.some((item) => item.id === selectedId)) setSelectedId(visibleItems[0].id);
  }, [selectedId, visibleItems]);

  useEffect(() => {
    setPrepared(false);
    setNotice("");
  }, [selected?.id, filter]);

  async function prepareMoneyReview() {
    if (busy) return;
    setBusy(true);
    setNotice("Preparing an owner-controlled Money Radar review…");
    const buffer = numberValue(bufferTarget, 0);
    const selectedTitle = selected?.title || "Whole money position";
    const selectedType = selected?.type || "Money review";
    const missing = [];
    if (!snapshot.jobs.length && !snapshot.invoices.length) missing.push("No live jobs or invoices were returned");
    if (!buffer) missing.push("Cash buffer target is missing");
    const evidence = [
      `Completed, not invoiced: ${radar.completedUninvoiced.length}`,
      `Draft invoices: ${radar.draftInvoices.length}`,
      `Overdue invoices: ${radar.overdueInvoices.length}`,
      `Expected in 30 days: ${moneyLabel(radar.expected30)}`,
      `Worker costs found: ${moneyLabel(radar.workerCosts)}`,
      `Jobs at margin or closeout risk: ${radar.riskJobs.length}`,
    ];
    try {
      await createBackendCommandSlip({
        area: "money",
        record: [selectedType, selectedTitle, selected?.status || "Owner money review", selected?.client || "Business position"],
        action: "Prepare Money Radar review",
        slip: {
          source_type: "money_radar_review",
          action_type: "owner_review_money_radar",
          source_id: `money-radar-${selected?.id || "business"}`,
          title: selected ? `Money Radar: ${selected.title}` : "Money Radar: business position",
          found: `Churvox found ${moneyLabel(radar.moneyWaiting)} waiting in completed work and draft invoices, ${moneyLabel(radar.expected30)} expected over 30 days and ${moneyLabel(radar.workerCosts)} in worker costs.`,
          prepared: `A Money Radar review is ready around ${selectedTitle}. Nothing was sent, synced, charged, marked paid or changed.`,
          why: missing.length
            ? "Some money facts could not be confirmed, so the owner must correct the review before approving an internal follow-up or invoice direction."
            : "The owner can review the cash position, choose a next internal draft and keep every external money action locked.",
          urgency: radar.overdueInvoices.length ? "Top priority" : radar.riskJobs.length ? "Needs check" : "Owner review",
          payload: {
            office_role: "Bookkeeper",
            prepared_form: {
              selected_focus: selectedTitle,
              focus_type: selectedType,
              client: selected?.client || "Business-wide review",
              focus_value: selected ? moneyLabel(selected.value) : moneyLabel(radar.moneyWaiting),
              focus_status: selected?.status || "Review the overall money position",
              completed_not_invoiced: `${radar.completedUninvoiced.length} · ${moneyLabel(radar.completedUninvoiced.reduce((sum, job) => sum + job.value, 0))}`,
              draft_invoices: `${radar.draftInvoices.length} · ${moneyLabel(radar.draftInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0))}`,
              overdue: `${radar.overdueInvoices.length} · ${moneyLabel(radar.overdueInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0))}`,
              expected_next_7_days: moneyLabel(radar.expected7),
              expected_next_30_days: moneyLabel(radar.expected30),
              worker_costs: moneyLabel(radar.workerCosts),
              estimated_30_day_cash_after_worker_costs: moneyLabel(radar.cash30),
              cash_buffer_target: moneyLabel(buffer),
              buffer_position: moneyLabel(radar.cash30 - buffer),
              owner_note: ownerNote || "Owner reviewed the Money Radar position.",
            },
            evidence,
            missing,
            confidence: {
              score: missing.length ? 62 : snapshot.source === "live" ? 91 : 76,
              why: missing.length ? ["Some live money sources were empty", "The review remains editable"] : ["Live jobs and invoices were checked", "The cash figures are calculated from returned records"],
            },
            owner_question: selected
              ? "Approve the internal money review, prepare the next safe follow-up, ask for more information, or park it?"
              : "Approve the business-wide money review, ask for more information, or park it?",
            actions: ["Approve money review", "Prepare safe follow-up", "Park"],
            will_do: [
              "Save an owner-approved internal Money Radar review",
              "Prepare only the selected invoice, follow-up or job-money direction",
              "Keep invoice sending, payment collection, paid status, accounting sync, payroll payment, tax filing and record changes locked",
              "Record the owner approval trail",
            ],
            source: "money_radar_signature_flow",
            prepared_only: true,
            owner_review_only: true,
            no_auto_send: true,
            no_auto_sync: true,
            no_auto_charge: true,
            no_auto_record_change: true,
            no_auto_mark_paid: true,
            no_auto_payroll: true,
            no_auto_tax: true,
          },
        },
      });
      setPrepared(true);
      setNotice("Money Radar is waiting in Command. The owner can edit the figures and approve only the internal next step.");
    } catch (error) {
      setPrepared(false);
      setNotice(`Money Radar could not be prepared. Nothing was sent, synced, charged, marked paid or changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvSiteScreen cvSignatureFlow cvMoneyRadarFlow" data-version="CHURVOX_MONEY_RADAR_V1_20260714">
      <header className="cvSignatureHero cvMoneyRadarHero">
        <div>
          <span>Owner money desk · {snapshot.label}</span>
          <h2>Money Radar</h2>
          <p>See money waiting, money expected, overdue follow-ups, worker costs and jobs likely to leak margin. Churvox prepares the next safe step; the owner still approves it in Command.</p>
        </div>
        <div className="cvSignatureHeroMetrics cvMoneyRadarMetrics" aria-label="Money Radar summary">
          <article><strong>{moneyLabel(radar.moneyWaiting)}</strong><small>Waiting for admin</small></article>
          <article><strong>{moneyLabel(radar.expected7)}</strong><small>Expected in 7 days</small></article>
          <article><strong>{moneyLabel(radar.expected30)}</strong><small>Expected in 30 days</small></article>
          <article><strong>{moneyLabel(radar.workerCosts)}</strong><small>Worker costs</small></article>
          <article className={radar.cash30 >= 0 ? "good" : "warn"}><strong>{moneyLabel(radar.cash30)}</strong><small>30-day position</small></article>
        </div>
      </header>

      <section className="cvMoneyRadarBridge" aria-label="Thirty day cash bridge">
        <article><span>Starting from returned receivables</span><strong>{moneyLabel(radar.expected30)}</strong><small>Unpaid invoices plus completed work not yet invoiced</small></article>
        <i>−</i>
        <article><span>Worker costs found</span><strong>{moneyLabel(radar.workerCosts)}</strong><small>Gross review only · no payroll payment or tax filing</small></article>
        <i>=</i>
        <article className={radar.cash30 >= 0 ? "good" : "warn"}><span>Estimated position</span><strong>{moneyLabel(radar.cash30)}</strong><small>Directional view from the live records Churvox could confirm</small></article>
      </section>

      <div className="cvMoneyRadarToolbar">
        <div className="cvSignatureFilters" aria-label="Money Radar filters">
          {FILTERS.map(([key, label]) => <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <small>{visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} in this view</small>
      </div>

      {radar.reviewItems.length ? (
        <div className="cvSignatureWorkspace cvMoneyRadarWorkspace">
          <section className="cvSignatureList cvMoneyRadarList" aria-label="Money Radar items">
            <header><div><span>What needs attention</span><strong>Ranked money work</strong></div><small>{snapshot.source}</small></header>
            {visibleItems.length ? visibleItems.map((item) => (
              <button key={item.id} type="button" className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
                <span>{item.type}</span>
                <strong>{item.title}</strong>
                <small>{item.client}</small>
                <em className={item.tone}>{moneyLabel(item.value)} · {item.status}</em>
              </button>
            )) : <article className="cvSignatureListEmpty"><strong>No items in this filter</strong><p>Choose another Money Radar view.</p></article>}
          </section>

          <section className="cvSignatureDetail cvMoneyRadarDetail" aria-label="Selected money review">
            {selected ? (
              <>
                <header><div><span>{selected.type}</span><h3>{selected.title}</h3><p>{selected.detail}</p></div><em className={selected.tone}>{selected.status}</em></header>
                <div className="cvMoneyRadarSelectedValue"><span>Value in review</span><strong>{moneyLabel(selected.value)}</strong><small>{selected.client}</small></div>
                <div className="cvMoneyRadarFacts">
                  <article><small>Completed, not invoiced</small><strong>{radar.completedUninvoiced.length}</strong><span>{moneyLabel(radar.completedUninvoiced.reduce((sum, job) => sum + job.value, 0))}</span></article>
                  <article><small>Draft invoices</small><strong>{radar.draftInvoices.length}</strong><span>{moneyLabel(radar.draftInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0))}</span></article>
                  <article><small>Overdue</small><strong>{radar.overdueInvoices.length}</strong><span>{moneyLabel(radar.overdueInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0))}</span></article>
                  <article><small>Jobs at risk</small><strong>{radar.riskJobs.length}</strong><span>Time, extras or missing closeout facts</span></article>
                </div>
                <div className="cvMoneyRadarReviewFields">
                  <label>Cash buffer target<input type="number" min="0" step="100" value={bufferTarget} onChange={(event) => { setBufferTarget(event.target.value); setPrepared(false); }} /></label>
                  <label className="wide">Owner note<textarea rows="3" value={ownerNote} onChange={(event) => { setOwnerNote(event.target.value); setPrepared(false); }} placeholder="Add context for the approved money review" /></label>
                </div>
                <section className="cvMoneyRadarSafety">
                  <strong>What approval can do</strong>
                  <p>Create an internal review or prepared follow-up direction using the checked figures.</p>
                  <strong>What approval does not do</strong>
                  <p>It does not send an invoice, chase a customer, collect payment, mark anything paid, sync accounting, pay workers or file tax.</p>
                </section>
                <footer className="cvSignatureActions">
                  <button type="button" className="primary" disabled={busy} onClick={prepareMoneyReview}>{busy ? "Preparing…" : "Prepare Money Radar review"}</button>
                  <button type="button" onClick={() => go("jobdone")}>Open Job Done</button>
                  {prepared ? <button type="button" onClick={() => go("command")}>Open Command</button> : null}
                  <small>The figures are a directional owner view based only on records Churvox could load.</small>
                </footer>
                {notice ? <p className="cvSignatureNotice" role="status" aria-live="polite">{notice}</p> : null}
              </>
            ) : <article className="cvSignatureEmpty"><strong>No money item selected</strong><p>Choose a Money Radar item or wait for live money records.</p></article>}
          </section>
        </div>
      ) : (
        <article className="cvSignatureEmpty">
          <strong>{snapshot.source === "loading" ? "Checking the money position" : "Money Radar is clear"}</strong>
          <p>{snapshot.source === "loading" ? "Churvox is checking jobs, invoices, quotes and gross worker costs." : "No completed uninvoiced work, draft invoices, overdue balances, quote follow-ups or job risks were found in the returned records."}</p>
          <button type="button" onClick={() => go("invoices")}>Open Invoices</button>
        </article>
      )}
    </section>
  );
}

function matchesFilter(item, filter) {
  if (filter === "all") return true;
  const type = String(item?.type || "").toLowerCase();
  if (filter === "uninvoiced") return type.includes("not invoiced");
  if (filter === "draft") return type.includes("draft invoice");
  if (filter === "overdue") return type.includes("overdue");
  if (filter === "risk") return type.includes("risk");
  if (filter === "quotes") return type.includes("quote");
  return true;
}
