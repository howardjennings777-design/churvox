import React from "react";
import { buildProductSmartActions, smartActionsForPage, ownerActionRecord } from "./productSmartActions";

function actionTone(type) {
  if (/Missing|Problem/i.test(type)) return "bad";
  if (/Invoice|Quote|Follow-up/i.test(type)) return "money";
  return "good";
}

export default function ProductSmartActionsPanel({ page = "command", data = {}, api, refresh, notify }) {
  const [filter, setFilter] = React.useState(page === "command" ? "all" : "page");
  const [busy, setBusy] = React.useState("");
  const actions = React.useMemo(() => buildProductSmartActions(data), [data]);
  const visible = React.useMemo(() => (filter === "all" ? actions : smartActionsForPage(page, actions)).slice(0, 5), [actions, filter, page]);

  async function sendToCommand(action) {
    if (!action || !api) return;
    setBusy(action.type);
    try {
      await api.post("/command/execute-approved", { action: "edit", item: ownerActionRecord(action, "waiting_owner_review") });
      notify?.({ title: "Sent to Command", text: `${action.type} is waiting for owner review.` });
      await refresh?.();
    } catch (error) {
      notify?.({ title: "Smart Action not saved", text: error?.message || "Could not send this to Command.", tone: "bad" });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="cvxPanel cvxSmartNative span12">
      <header>
        <div>
          <h3>Smart Actions</h3>
          <p>Churvox prepares useful admin moves from live records. The owner still reviews everything in Command.</p>
        </div>
        <div className="cvxSmartNativeTabs">
          <button type="button" className={filter === "page" ? "active" : ""} onClick={() => setFilter("page")}>This page</button>
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All 10</button>
        </div>
      </header>
      <div className="cvxSmartNativeGrid">
        {visible.map((action) => (
          <article key={action.type} className={`cvxSmartNativeCard ${actionTone(action.type)}`}>
            <div>
              <small>{action.type}</small>
              <h4>{action.title}</h4>
              <p>{action.summary}</p>
            </div>
            <div className="cvxSmartNativeDetails">
              {(action.details || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}
            </div>
            <footer>
              <b>{action.recommendation}</b>
              <button type="button" onClick={() => sendToCommand(action)} disabled={Boolean(busy)}>{busy === action.type ? "Sending…" : "Send to Command"}</button>
            </footer>
          </article>
        ))}
        {!visible.length && <div className="cvxEmpty"><b>No Smart Actions yet</b><span>Add jobs, clients, workers, quotes, invoices or messages and Churvox will prepare useful next moves.</span></div>}
      </div>
    </section>
  );
}
