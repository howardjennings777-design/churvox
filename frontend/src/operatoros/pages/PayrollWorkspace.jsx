import EmptyState from "../components/EmptyState";
import { titleOf } from "../api";

export default function PayrollWorkspace({ data }) {
  const workers = data.workers || [];
  const completedJobs = data.completedJobs || [];

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>PAYROLL</p>
          <h1>Payroll review and export.</h1>
          <span>Approved hours, worker summaries, payroll notes and export/handoff. No bank payouts or government filing.</span>
        </div>
      </section>

      <section className="op-payroll-grid">
        <article className="op-panel"><header><div><p>APPROVED HOURS</p><h2>{completedJobs.length}</h2></div></header><p>Completed jobs can feed payroll review once time entries are approved.</p></article>
        <article className="op-panel"><header><div><p>WORKER SUMMARIES</p><h2>{workers.length}</h2></div></header><p>Workers appear here for pay summary review and export preparation.</p></article>
        <article className="op-panel"><header><div><p>GUARDRAIL</p><h2>Review only</h2></div></header><p>Churvox does not submit tax, government files, or bank payouts in launch scope.</p></article>
      </section>

      <section className="op-list">
        {!workers.length ? (
          <EmptyState title="No workers yet" body="Add or import workers before payroll summaries can be prepared." />
        ) : (
          workers.map((worker, index) => (
            <article className="op-row" key={worker.id || worker._id || index}>
              <div>
                <strong>{titleOf(worker, `Worker ${index + 1}`)}</strong>
                <small>{worker.role || "worker"} · {worker.region || "No region set"} · Payroll review ready</small>
              </div>
              <span className="op-status blue">Review</span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
