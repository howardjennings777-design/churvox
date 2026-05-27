// CHURVOX_DISPATCH_BOARD_PAGE_20260528
import React, { useEffect, useState } from "react";
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

  return (
    <main className="cdb-shell" data-version="CHURVOX_DISPATCH_BOARD_PAGE_20260528">
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
          <b>{state.loading ? "Loading" : "Live lanes"}</b>
          <em>{state.error || "Command Floor remains the approval flow"}</em>
        </aside>
      </section>

      <section className="cdb-board">
        {Object.entries(laneLabels).map(([key, label]) => {
          const rows = Array.isArray(state.lanes?.[key]) ? state.lanes[key] : [];

          return (
            <article className={`cdb-lane cdb-lane-${key}`} key={key}>
              <header>
                <span>{label}</span>
                <b>{rows.length}</b>
              </header>

              <div className="cdb-rows">
                {rows.length ? rows.slice(0, 14).map((job, index) => (
                  <Link to={job.id ? `/jobs/${job.id}` : "/jobs"} className="cdb-job" key={job.id || job._id || index}>
                    <strong>{job.title || job.job_name || job.customer_name || job.client_name || "Job"}</strong>
                    <small>{job.address || job.site_address || job.status || "Job record"}</small>
                  </Link>
                )) : (
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
      </footer>
    </main>
  );
}
