import React, { useMemo, useState } from "react";
import "./OfficeTeamCorePageIdentity.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Draft", "Garden tidy quote", "$420", "Scope is ready and the price needs an owner check."],
  ["Viewed", "Monthly cleaning package", "$680", "The client viewed the quote and a follow-up can be prepared."],
  ["Waiting", "Hair colour booking", "$210", "Deposit wording needs review before anything is sent."],
  ["Convert", "Maintenance quote", "$1,250", "The approved quote is ready to become work."],
];

const stages = [
  ["draft", "Building"],
  ["sent", "With client"],
  ["followup", "Needs follow-up"],
  ["won", "Ready to convert"],
];

export default function OfficeTeamQuotesWorkspace({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("quotes", fallbackRows, { allowFallback, emptyMessage: "No live quotes found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const rows = live.rows;
  const current = selectedRow(rows, selected, allowFallback ? fallbackRows : []);
  const grouped = useMemo(() => Object.fromEntries(stages.map(([key]) => [key, rows.filter((row) => quoteStage(row) === key)])), [rows]);
  const pipelineValue = rows.reduce((sum, row) => sum + parseMoney(row?.[2]), 0);

  return (
    <section className="cvSiteScreen cvQuotesWorkspace">
      <header className="cvCorePageHero cvQuotesHero">
        <div>
          <span>Quote pipeline</span>
          <h2>Move opportunities forward without chasing blindly.</h2>
          <p>Quotes live in a visible journey from scope to conversion. Churvox prepares the next step, but sending, changing price and creating work remain owner-controlled.</p>
        </div>
        <div className="cvCoreHeroStats" aria-label="Quote summary">
          <article><strong>{rows.length}</strong><small>Open quotes</small></article>
          <article><strong>{formatMoney(pipelineValue)}</strong><small>Pipeline value</small></article>
          <article><strong>{grouped.followup?.length || 0}</strong><small>Need follow-up</small></article>
        </div>
      </header>

      <div className="cvQuotePipeline" aria-label="Quote stages">
        {stages.map(([key, label]) => (
          <section key={key} className={`cvQuoteStage ${key}`}>
            <header><div><span>{label}</span><small>{stageHelp(key)}</small></div><strong>{grouped[key]?.length || 0}</strong></header>
            <div>
              {grouped[key]?.length ? grouped[key].map((row) => (
                <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
                  <span>{row[0]}</span>
                  <strong>{row[1]}</strong>
                  <em>{row[2]}</em>
                  <small>{row[3]}</small>
                </button>
              )) : <p>Nothing here</p>}
            </div>
          </section>
        ))}
      </div>

      <div className="cvQuoteWorkbench">
        <section className="cvQuoteScopeSheet">
          {rows.length ? (
            <>
              <header><div><span>Selected quote</span><h3>{current[1]}</h3></div><strong>{current[2] || "Value not found"}</strong></header>
              <div className="cvQuoteScopeGrid">
                <article><small>Pipeline stage</small><strong>{current[0] || "Not found"}</strong></article>
                <article><small>Price / value</small><strong>{current[2] || "Not found"}</strong></article>
                <article className="wide"><small>Scope or latest note</small><strong>{current[3] || "No scope detail found"}</strong></article>
              </div>
              <section className="cvQuoteOwnerCheck">
                <span>Before this moves</span>
                <ul>
                  <li>Scope matches what the client asked for</li>
                  <li>Price and any deposit wording are correct</li>
                  <li>The next action is appropriate for this stage</li>
                  <li>Nothing sends or converts until the owner approves</li>
                </ul>
              </section>
              <OfficeTeamSafeControls area="quotes" record={current} primary="Prepare quote draft" secondary="Prepare follow-up" command="Prepare conversion decision" />
            </>
          ) : <Empty title="No quote selected" text={ownerRoute ? "Create or import a quote below." : "Live quotes will appear here."} />}
        </section>

        <aside className="cvQuoteMomentum">
          <span>Pipeline health</span>
          <h3>Where attention belongs</h3>
          <div>
            {stages.map(([key, label]) => (
              <article key={key}><span>{label}</span><strong>{grouped[key]?.length || 0}</strong><small>{momentumNote(key, grouped[key]?.length || 0)}</small></article>
            ))}
          </div>
          <p>{live.label}</p>
        </aside>
      </div>

      <section className="cvCoreWorkingDock cvQuoteIntakeDock">
        <div><span>Quote builder</span><h3>Turn rough scope into reviewable work</h3><p>Create one quote or import rows. The owner still sees the exact prepared values before a draft is approved, sent or converted.</p></div>
        <OfficeTeamWorkForms area="quotes" title="Quotes" selectedRecord={current} />
      </section>
    </section>
  );
}

function quoteStage(row) {
  const status = String(row?.[0] || "").toLowerCase();
  if (/convert|accepted|approved|won|ready/.test(status)) return "won";
  if (/viewed|waiting|follow|expired|no reply/.test(status)) return "followup";
  if (/sent|issued|delivered/.test(status)) return "sent";
  return "draft";
}

function parseMoney(value) {
  const number = Number(String(value || "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return value ? `$${Math.round(value).toLocaleString()}` : "$0";
}

function stageHelp(stage) {
  if (stage === "draft") return "Scope and price being prepared";
  if (stage === "sent") return "Waiting on the client";
  if (stage === "followup") return "A sensible next step may help";
  return "Approved opportunity can become work";
}

function momentumNote(stage, count) {
  if (!count) return "Clear";
  if (stage === "followup") return "Review timing before contacting anyone";
  if (stage === "won") return "Check the job setup before conversion";
  if (stage === "draft") return "Finish scope before sending";
  return "Client decision pending";
}

function Empty({ title, text }) {
  return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
