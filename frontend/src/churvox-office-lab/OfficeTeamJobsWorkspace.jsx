import React, { useMemo, useState } from "react";
import "./OfficeTeamCorePageIdentity.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Today", "Green waste follow-up", "Needs owner decision", "Extra work was noted and the invoice direction needs checking."],
  ["Tomorrow", "Regular cleaning visit", "Ready", "The visit has a date and assigned worker."],
  ["Friday", "Hair appointment rebook", "Prepared", "A rebooking step is ready for review."],
  ["Next week", "Repeat maintenance", "Review price", "Recent visits took longer and the price may need checking."],
];

const filters = [
  ["all", "All jobs"],
  ["today", "Today"],
  ["attention", "Needs attention"],
  ["complete", "Completed"],
];

export default function OfficeTeamJobsWorkspace({ appMode = "lab", go = () => {} }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("work", fallbackRows, { allowFallback, emptyMessage: "No live jobs found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [filter, setFilter] = useState("all");
  const rows = live.rows;
  const current = selectedRow(rows, selected, allowFallback ? fallbackRows : []);

  const groups = useMemo(() => ({
    now: rows.filter((row) => jobLane(row) === "now"),
    next: rows.filter((row) => jobLane(row) === "next"),
    attention: rows.filter((row) => jobLane(row) === "attention"),
    done: rows.filter((row) => jobLane(row) === "done"),
  }), [rows]);

  const visibleRows = useMemo(() => rows.filter((row) => matchesFilter(row, filter)), [filter, rows]);
  const hasRows = rows.length > 0;
  const decisionCount = groups.attention.length;

  return (
    <section className="cvSiteScreen cvJobsWorkspace">
      <header className="cvCorePageHero cvJobsHero">
        <div>
          <span>Jobs control board</span>
          <h2>See the run. Fix only what blocks it.</h2>
          <p>Jobs are organised by movement through the day, not by generic cards. Churvox keeps normal work moving and brings exceptions back through Command.</p>
        </div>
        <div className="cvCoreHeroStats" aria-label="Jobs summary">
          <article><strong>{rows.length}</strong><small>Live jobs</small></article>
          <article><strong>{groups.now.length}</strong><small>Today</small></article>
          <article><strong>{decisionCount}</strong><small>Need attention</small></article>
        </div>
      </header>

      <div className="cvJobsControlRail">
        <div className="cvCoreFilterBar" aria-label="Job filters">
          {filters.map(([key, label]) => (
            <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        <small>{live.label}</small>
      </div>

      <div className="cvJobsBoardLayout">
        <section className="cvJobsRunBoard" aria-label="Job run board">
          {hasRows ? (
            <>
              <JobLane title="On the run" note="Work happening now or due today" rows={filter === "all" ? groups.now : visibleRows.filter((row) => jobLane(row) === "now")} current={current} onSelect={setSelected} />
              <JobLane title="Coming up" note="The next work Churvox is watching" rows={filter === "all" ? groups.next : visibleRows.filter((row) => jobLane(row) === "next")} current={current} onSelect={setSelected} />
              <JobLane title="Owner checkpoint" note="Only work with a real exception" rows={filter === "all" ? groups.attention : visibleRows.filter((row) => jobLane(row) === "attention")} current={current} onSelect={setSelected} attention />
              <JobLane title="Finished" note="Completed work remains visible for handoff" rows={filter === "all" ? groups.done : visibleRows.filter((row) => jobLane(row) === "done")} current={current} onSelect={setSelected} />
            </>
          ) : <Empty title="No jobs yet" text={ownerRoute ? "Create or import the first job below. Churvox will keep routine work off Command until a real decision is needed." : "Live jobs will appear here when connected."} />}
        </section>

        <aside className="cvJobSheet" aria-label="Selected job sheet">
          {hasRows ? (
            <>
              <div className="cvJobSheetTop">
                <span>{current[0] || "Schedule not found"}</span>
                <em className={statusTone(current[2])}>{current[2] || "Status not found"}</em>
              </div>
              <h3>{current[1]}</h3>
              <p>{current[3]}</p>
              <div className="cvJobFacts">
                <article><small>When</small><strong>{current[0] || "Not found"}</strong></article>
                <article><small>Current state</small><strong>{current[2] || "Not found"}</strong></article>
                <article className="wide"><small>Latest live detail</small><strong>{current[3] || "No detail found"}</strong></article>
              </div>
              <div className="cvJobControlPath">
                <span>Owner-control path</span>
                <ol>
                  <li className="done">Record checked</li>
                  <li className={jobLane(current) === "attention" ? "active" : "done"}>Exception identified</li>
                  <li>Prepare in Command</li>
                  <li>Owner approves only if needed</li>
                </ol>
              </div>
              <OfficeTeamSafeControls area="work" record={current} primary="Prepare job change" secondary="Review job details" command="Open owner decision" />
              {jobLane(current) === "done" ? <button type="button" className="cvJobDoneLaunch" onClick={() => go("jobdone")}>Open Job Done closeout</button> : null}
            </>
          ) : <Empty title="No job selected" text="The job sheet will open when a real job exists." />}
        </aside>
      </div>

      <section className="cvCoreWorkingDock">
        <div><span>Job intake</span><h3>Add work without leaving the control board</h3><p>Create one job, paste a normal instruction or import real rows. The prepared result still goes through Command where approval is required.</p></div>
        <OfficeTeamWorkForms area="work" title="Jobs" selectedRecord={current} />
      </section>
    </section>
  );
}

function JobLane({ title, note, rows, current, onSelect, attention = false }) {
  return (
    <section className={`cvJobLane ${attention ? "attention" : ""}`}>
      <header><div><span>{title}</span><small>{note}</small></div><strong>{rows.length}</strong></header>
      <div>
        {rows.length ? rows.map((row) => (
          <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => onSelect(row)}>
            <small>{row[0]}</small>
            <strong>{row[1]}</strong>
            <em>{row[2]}</em>
          </button>
        )) : <p className="cvLaneClear">Nothing here</p>}
      </div>
    </section>
  );
}

function matchesFilter(row, filter) {
  if (filter === "all") return true;
  const when = String(row?.[0] || "").toLowerCase();
  const status = String(row?.[2] || "").toLowerCase();
  if (filter === "today") return /today|now|current/.test(when);
  if (filter === "attention") return /need|review|check|hold|issue|missing|overdue|blocked/.test(status);
  if (filter === "complete") return /complete|completed|done|finished|closed/.test(status);
  return true;
}

function jobLane(row) {
  const when = String(row?.[0] || "").toLowerCase();
  const status = String(row?.[2] || "").toLowerCase();
  if (/complete|completed|done|finished|closed/.test(status)) return "done";
  if (/need|review|check|hold|issue|missing|overdue|blocked/.test(status)) return "attention";
  if (/today|now|current|in progress|started/.test(`${when} ${status}`)) return "now";
  return "next";
}

function statusTone(value) {
  const status = String(value || "").toLowerCase();
  if (/complete|done|ready/.test(status)) return "good";
  if (/need|review|check|hold|issue|missing|overdue|blocked/.test(status)) return "warn";
  return "neutral";
}

function Empty({ title, text }) {
  return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
