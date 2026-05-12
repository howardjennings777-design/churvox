import { computeOperatorCommandCore } from "../pages/aiCommandCore";

export default function AICommandCorePanel({ data = {}, onNav }) {
  const core = computeOperatorCommandCore(data);

  return (
    <section className="op-panel op-command-core">
      <header>
        <div>
          <p>AI COMMAND CORE</p>
          <h2>Best move right now</h2>
        </div>
        <button type="button" onClick={() => onNav?.(core.briefing.nav || "queue")}>
          Open
        </button>
      </header>

      <div className="op-command-best">
        <span>Priority {core.bestAction?.priority_score || core.quality.score}</span>
        <h3>{core.briefing.title}</h3>
        <p>{core.briefing.summary}</p>
        <small>{core.briefing.reason}</small>
      </div>

      <div className="op-command-metrics">
        {core.lanes.map((lane) => (
          <button key={lane.key} type="button" onClick={() => onNav?.(lane.nav)}>
            <span>{lane.label}</span>
            <strong>{lane.value}</strong>
            {lane.money ? <b>{lane.money}</b> : null}
            <small>{lane.status}</small>
          </button>
        ))}
      </div>

      <div className="op-command-bottom">
        <section>
          <p>Data quality</p>
          <strong>{core.quality.score}%</strong>
          <small>
            {core.quality.missing.length
              ? `Needs: ${core.quality.missing.map((item) => item.label).join(", ")}`
              : "Enough data for AI operator decisions"}
          </small>
        </section>

        <section>
          <p>Approval guardrails</p>
          <div className="op-command-guardrails">
            {core.guardrails.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
