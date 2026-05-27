// CHURVOX_DISPATCH_BOARD_PAGE_20260528
// CHURVOX_DISPATCH_BOARD_OPERATOR_UPGRADE_20260528
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDispatchBoard } from "../concept-c/churvoxTopTierApi";
import "./DispatchBoardPage.css";

const laneLabels = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  needs_review: "Needs review",
  ready_to_invoice: "Ready to invoice",
};

const laneHelp = {
  unassigned: "Needs owner/admin to assign crew.",
  assigned: "Crew has the job.",
  in_progress: "Work is active in the field.",
  completed: "Worker marked it complete.",
  needs_review: "Owner should open Work Slip.",
  ready_to_invoice: "Admin is ready for money desk.",
};

function jobId(job) {
  return job?.id || job?._id || job?.job_id || "";
}

function jobTitle(job) {
  return job?.title || job?.job_name || job?.customer_name || job?.client_name || "Job";
}

function jobClient(job) {
  return job?.customer_name || job?.client_name || job?.client || "No client name";
}

function jobPlace(job) {
  return job?.address || job?.site_address || job?.region || job?.suburb || "No address saved";
}

function jobWorker(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.assigned_to_name || job?.assigned_worker_id || "No worker shown";
}

export default function DispatchBoardPage() {
  const [state, setState] = useState({ loading: true, error: "", lanes: {} });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await getDispatchBoard();
        if (!alive) return;
        setState({ loading: false, error: "", lanes: data.lanes || {} });
      } catch (err) {
        if (!alive) return;
        setState({ loading: false, error: err?.message || "Could not load dispatch board", lanes: {} });
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(laneLabels).map((key) => [key, Array.isArray(state.lanes?.[key]) ? state.lanes[key].length : 0]));
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { counts, total };
  }, [state.lanes]);

  return (
    <main className="cdb-shell" data-version="CHURVOX_DISPATCH_BOARD_PAGE_20260528 CHURVOX_DISPATCH_BOARD_OPERATOR_UPGRADE_20260528">
      <section className="cdb-hero">
        <div>
          <p>DISPATCH BOARD</p>
          <h1>See work moving across the business.</h1>
          <span>
            Jobs grouped by unassigned, assigned, in progress, completed, review and invoice lanes.
          </span>
        </div>
        <aside>
          <small>Status</small>
          <b>{state.loading ? "Loading" : `${summary.total} jobs`}</b>
          <em>{state.error || "Command Floor remains the approval flow"}</em>
        </aside>
      </section>

      <section className="cdb-summary-strip">
        <article><small>Needs crew</small><b>{summary.counts.unassigned || 0}</b></article>
        <article><small>In field</small><b>{(summary.counts.assigned || 0) + (summary.counts.in_progress || 0)}</b></article>
        <article><small>Owner review</small><b>{summary.counts.needs_review || 0}</b></article>
        <article><small>Money desk</small><b>{summary.counts.ready_to_invoice || 0}</b></article>
      </section>

      <section className="cdb-board">
        {Object.entries(laneLabels).map(([key, label]) => {
          const rows = Array.isArray(state.lanes?.[key]) ? state.lanes[key] : [];

          return (
            <article className={`cdb-lane cdb-lane-${key}`} key={key}>
              <header>
                <span>{label}</span>
                <b>{rows.length}</b>
                <small>{laneHelp[key]}</small>
              </header>

              <div className="cdb-rows">
                {rows.length ? rows.slice(0, 18).map((job, index) => {
                  const id = jobId(job);
                  return (
                    <Link to={id ? `/jobs/${id}` : "/jobs"} className="cdb-job" key={id || index}>
                      <strong>{jobTitle(job)}</strong>
                      <small>{jobClient(job)}</small>
                      <em>{jobPlace(job)}</em>
                      <span>{jobWorker(job)}</span>
                    </Link>
                  );
                }) : (
                  <div className="cdb-empty">Nothing here.</div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <footer className="cdb-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open AI Operator tools</Link>
        <Link to="/jobs/new">Create job</Link>
      </footer>
    </main>
  );
}
