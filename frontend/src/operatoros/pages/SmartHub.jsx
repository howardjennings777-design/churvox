import { buildAiActions } from "./aiActions";
import ActionCard from "../components/ActionCard";
import EmptyState from "../components/EmptyState";
import FloatingLogo from "../components/FloatingLogo";
import StatusBadge from "../components/StatusBadge";
import AIReadinessPanel from "../components/AIReadinessPanel";
import { clientOf, moneyOf, statusOf, titleOf } from "../api";

function MiniPanel({ title, items = [], empty, onOpen }) {
  return (
    <section className="op-panel">
      <header>
        <div>
          <p>{title}</p>
          <h2>{items.length}</h2>
        </div>
        {onOpen ? <button onClick={onOpen}>Open</button> : null}
      </header>

      {!items.length ? (
        <EmptyState title={empty} />
      ) : (
        <div className="op-mini-list">
          {items.slice(0, 4).map((item, index) => (
            <article key={item.id || item._id || index}>
              <div>
                <strong>{titleOf(item, `${title} ${index + 1}`)}</strong>
                <small>
                  {[clientOf(item), moneyOf(item)].filter((x) => x && x !== "—").join(" · ") ||
                    statusOf(item)}
                </small>
              </div>
              <StatusBadge value={statusOf(item)} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SmartHub({ data, onNav, onCreate }) {
  const actions = buildAiActions(data);

  const setupIssues = [
    data.currentPlan === "none" ? "Choose a plan" : "",
    !data.clients?.length ? "Import or add clients" : "",
    !data.workers?.length ? "Add crew" : "",
    Number(data.smsBalance || 0) <= 10 ? "SMS credits low" : "",
    !data.myobConnected && ["pro", "enterprise"].includes(String(data.currentPlan).toLowerCase())
      ? "MYOB not connected"
      : "",
  ].filter(Boolean);

  return (
    <main className="op-smart">
      <section className="op-hero op-command-hero">
        <div>
          <p>CHURVOX AI OPERATOR OS</p>
          <h1>
            AI prepares the admin.
            <br />
            <span>You approve the work.</span>
          </h1>
          <small>
            Jobs, invoices, quotes, crew, SMS, MYOB and billing stay in one calm owner command centre.
          </small>
          <footer>
            <button onClick={() => onNav("queue")}>Open AI Work Queue</button>
            <button onClick={() => onCreate?.("jobs")}>Create Job</button>
            <button onClick={() => onNav("import")}>Import CSV</button>
            <button onClick={() => onNav("system")}>System Centre</button>
          </footer>
        </div>

        <aside className="op-hero-orb">
          <FloatingLogo small />
          <strong>{actions.length}</strong>
          <span>prepared actions</span>
        </aside>
      </section>

      {data.notice ? <section className="op-notice">{data.notice}</section> : null}

      <section className="op-dashboard-grid">
        <section className="op-panel op-approval-panel">
          <header>
            <div>
              <p>AI WORK QUEUE</p>
              <h2>Prepared for approval</h2>
            </div>
            <button onClick={() => onNav("queue")}>Review all</button>
          </header>

          {!actions.length ? (
            <EmptyState
              title="No approvals waiting"
              body="Churvox is monitoring jobs, invoices, quotes, crew and payments."
            />
          ) : (
            <div className="op-action-stack">
              {actions.slice(0, 3).map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onReview={() => onNav("queue")}
                  onApprove={() => onNav("queue")}
                />
              ))}
            </div>
          )}
        </section>

        <MiniPanel title="Today’s run sheet" items={data.activeJobs || []} empty="No active jobs" onOpen={() => onNav("jobs")} />
        <MiniPanel title="Proof to paid" items={data.completedJobs || []} empty="No completed jobs waiting" onOpen={() => onNav("proof")} />
        <MiniPanel title="Money watch" items={data.unpaidInvoices || []} empty="No invoices to chase" onOpen={() => onNav("invoices")} />
      </section>

      <AIReadinessPanel data={data} onNav={onNav} />

      <section className="op-support-grid">
        <MiniPanel title="Crew watch" items={data.workers || []} empty="No crew added" onOpen={() => onNav("crew")} />
        <MiniPanel title="Quote follow-ups" items={data.openQuotes || []} empty="No quote follow-ups" onOpen={() => onNav("quotes")} />

        <section className="op-panel">
          <header>
            <div>
              <p>SETUP HEALTH</p>
              <h2>{setupIssues.length ? `${setupIssues.length} item${setupIssues.length > 1 ? "s" : ""}` : "Ready"}</h2>
            </div>
            <button onClick={() => onNav("system")}>Fix</button>
          </header>

          {!setupIssues.length ? (
            <EmptyState title="Setup looks good" />
          ) : (
            <div className="op-check-list">
              {setupIssues.map((issue) => (
                <button key={issue} onClick={() => onNav("system")}>{issue}</button>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
