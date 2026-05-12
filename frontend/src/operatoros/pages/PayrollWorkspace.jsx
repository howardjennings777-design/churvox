import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { clientOf, moneyOf, readLocalList, saveLocalList, titleOf } from "../api";

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(rows) {
  const headers = ["Worker", "Completed jobs", "Estimated value", "Notes"];
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => [
      row.worker,
      row.completedJobs,
      row.value,
      row.notes,
    ].map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `churvox-payroll-review-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function assignedName(job) {
  return String(job.assigned_worker_name || job.worker_name || job.assigned_to_name || job.worker?.name || "").toLowerCase();
}

export default function PayrollWorkspace({ data }) {
  const workers = data.workers || [];
  const completedJobs = data.completedJobs || [];
  const [notes, setNotes] = useState(() => readLocalList("churvox_payroll_notes")[0] || {});

  const rows = useMemo(() => {
    return workers.map((worker) => {
      const name = titleOf(worker, "Worker");
      const key = String(name).toLowerCase();
      const jobs = completedJobs.filter((job) => {
        const workerId = worker.id || worker._id;
        return (
          (workerId && [job.assigned_worker_id, job.worker_id, job.assigned_to].includes(workerId)) ||
          (key && assignedName(job) === key)
        );
      });

      const total = jobs.reduce((sum, job) => sum + Number(job.total || job.amount || job.price || job.job_price || 0), 0);

      return {
        id: worker.id || worker._id || name,
        worker: name,
        role: worker.role || "worker",
        region: worker.region || "No region set",
        completedJobs: jobs.length,
        valueNumber: total,
        value: total ? new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(total) : "—",
        notes: notes[worker.id || worker._id || name] || "",
      };
    });
  }, [workers, completedJobs, notes]);

  function saveNote(id, value) {
    const next = { ...notes, [id]: value };
    setNotes(next);
    saveLocalList("churvox_payroll_notes", [next], 1);
  }

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>PAYROLL</p>
          <h1>Payroll review, notes and export.</h1>
          <span>Review completed work by worker, add payroll notes, then export for accountant/payroll processing.</span>
        </div>
        <button type="button" className="primary" disabled={!rows.length} onClick={() => downloadCsv(rows)}>
          Export payroll review CSV
        </button>
      </section>

      <section className="op-payroll-grid">
        <article className="op-panel"><header><div><p>COMPLETED JOBS</p><h2>{completedJobs.length}</h2></div></header><p>Completed jobs feed the payroll review summary.</p></article>
        <article className="op-panel"><header><div><p>WORKERS</p><h2>{workers.length}</h2></div></header><p>Workers appear here for pay summary review and export preparation.</p></article>
        <article className="op-panel"><header><div><p>GUARDRAIL</p><h2>Review only</h2></div></header><p>No tax filing, government submission, or bank payout is performed by Churvox.</p></article>
      </section>

      <section className="op-list">
        {!rows.length ? (
          <EmptyState title="No workers yet" body="Add or import workers before payroll summaries can be prepared." />
        ) : (
          rows.map((row) => (
            <article className="op-row payroll-row" key={row.id}>
              <div>
                <strong>{row.worker}</strong>
                <small>{row.role} · {row.region} · {row.completedJobs} completed job{row.completedJobs === 1 ? "" : "s"} · {row.value}</small>
                <textarea
                  rows={2}
                  placeholder="Payroll/admin note for this worker"
                  value={row.notes}
                  onChange={(event) => saveNote(row.id, event.target.value)}
                />
              </div>
              <span className="op-status blue">Review</span>
            </article>
          ))
        )}
      </section>

      <section className="op-panel">
        <header><div><p>EXPORT SCOPE</p><h2>Safe handoff only</h2></div></header>
        <div className="op-check-list">
          <button>Exports payroll review CSV</button>
          <button>Stores local payroll notes</button>
          <button>Does not pay wages</button>
          <button>Does not file tax</button>
          <button>Does not submit government reports</button>
        </div>
      </section>
    </main>
  );
}
