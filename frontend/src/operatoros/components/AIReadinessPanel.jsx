import { buildAiActions } from "../pages/aiActions";

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function StatusDot({ ok }) {
  return <span className={ok ? "op-ready-dot ok" : "op-ready-dot warn"} />;
}

export default function AIReadinessPanel({ data = {}, onNav }) {
  const actions = buildAiActions(data);

  const rows = [
    {
      label: "Jobs loaded",
      value: count(data.jobs),
      ok: count(data.jobs) > 0,
      fix: "Create or import jobs",
      nav: "jobs",
    },
    {
      label: "Clients loaded",
      value: count(data.clients),
      ok: count(data.clients) > 0,
      fix: "Add/import clients",
      nav: "clients",
    },
    {
      label: "Workers loaded",
      value: count(data.workers),
      ok: count(data.workers) > 0,
      fix: "Add workers with regions and skills",
      nav: "crew",
    },
    {
      label: "Unassigned jobs",
      value: count(data.unassignedJobs),
      ok: count(data.unassignedJobs) > 0,
      fix: "Create a job and leave it unassigned",
      nav: "jobs",
    },
    {
      label: "Completed jobs",
      value: count(data.completedJobs),
      ok: count(data.completedJobs) > 0,
      fix: "Complete a job to trigger draft invoice prep",
      nav: "jobs",
    },
    {
      label: "Unpaid invoices",
      value: count(data.unpaidInvoices),
      ok: count(data.unpaidInvoices) > 0,
      fix: "Create/send an unpaid invoice",
      nav: "invoices",
    },
    {
      label: "Open quotes",
      value: count(data.openQuotes),
      ok: count(data.openQuotes) > 0,
      fix: "Create an open quote",
      nav: "quotes",
    },
    {
      label: "AI actions prepared",
      value: actions.length,
      ok: actions.length > 0,
      fix: "Add one trigger: unassigned job, completed job, unpaid invoice, or open quote",
      nav: "queue",
    },
  ];

  const ready = actions.length > 0;
  const missing = rows.filter((row) => !row.ok);

  return (
    <section className="op-panel op-ai-readiness">
      <header>
        <div>
          <p>AI OPERATOR READINESS</p>
          <h2>{ready ? "AI has work to prepare" : "AI needs more business data"}</h2>
        </div>
        <button type="button" onClick={() => onNav?.("queue")}>Open AI Queue</button>
      </header>

      <div className="op-readiness-score">
        <strong>{actions.length}</strong>
        <span>prepared action{actions.length === 1 ? "" : "s"}</span>
      </div>

      <div className="op-readiness-grid">
        {rows.map((row) => (
          <button key={row.label} type="button" onClick={() => onNav?.(row.nav)}>
            <StatusDot ok={row.ok} />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            {!row.ok ? <small>{row.fix}</small> : null}
          </button>
        ))}
      </div>

      {!ready ? (
        <div className="op-note">
          <strong>Next AI trigger needed</strong>
          <p>{missing[0]?.fix || "Add more records so AI can prepare owner-approved actions."}</p>
        </div>
      ) : (
        <div className="op-note">
          <strong>Ready for big test</strong>
          <p>AI has prepared actions. Review them in Smart Hub and approve one safe action.</p>
        </div>
      )}
    </section>
  );
}
