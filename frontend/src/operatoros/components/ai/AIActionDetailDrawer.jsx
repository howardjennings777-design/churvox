import { useEffect, useMemo, useState } from "react";

function parseEditedValue(original, value) {
  if (typeof original === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : original;
  }

  if (typeof original === "boolean") {
    return value === "true" || value === true;
  }

  if (Array.isArray(original) || (original && typeof original === "object")) {
    try {
      return JSON.parse(value);
    } catch {
      return original;
    }
  }

  return value;
}

function actionId(action) {
  return action?.id || action?._id || action?.action_id || "";
}

export default function AIActionDetailDrawer({ open, action, onClose, onApprove, onReject, onSaveEdits, busy }) {
  const [reason, setReason] = useState("");
  const [edited, setEdited] = useState({});
  const selectedActionId = actionId(action);
  const payload = useMemo(() => ({ ...(action?.suggested_payload || {}), ...edited }), [action, edited]);

  useEffect(() => {
    setReason("");
    setEdited({});
  }, [open, selectedActionId]);

  if (!open || !action) return null;

  const reasonPoints = action.reason_points || action.why || [];
  const dataUsed = action.data_used || action.dataUsed || [];
  const exactChanges = action.exact_changes || action.guardrail || "AI has prepared this action for owner approval.";
  const canEdit = action.owner_can_edit !== false;

  return (
    <div className="op-ai-drawer-backdrop">
      <aside className="op-ai-drawer">
        <header>
          <p>{action.category || action.type || action.action_type || "AI ACTION"}</p>
          <h3>{action.title || "AI prepared action"}</h3>
          <span>{action.status || "ready"} · Priority {action.priority_score || "—"} · Confidence {action.confidence || "—"} · Risk {action.risk || "low"}</span>
        </header>

        <section className="op-ai-detail-block">
          <strong>Why AI prepared this</strong>
          <p>{action.reason || action.summary || "Churvox found a business action ready for owner review."}</p>
          {reasonPoints.length ? <ul className="op-ai-reason-list">{reasonPoints.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
        </section>

        <section className="op-ai-detail-block">
          <strong>Exact change after approval</strong>
          <pre className="op-ai-exact-changes">{exactChanges}</pre>
        </section>

        {dataUsed.length ? (
          <section className="op-ai-detail-block">
            <strong>Data used</strong>
            <pre className="op-ai-data-used">{JSON.stringify(dataUsed, null, 2)}</pre>
          </section>
        ) : null}

        <section className="op-ai-detail-block">
          <strong>Prepared payload</strong>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </section>

        {canEdit && action.suggested_payload ? (
          <section className="op-ai-edit-grid">
            {Object.keys(action.suggested_payload || {}).map((key) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  value={String(payload[key] ?? "")}
                  onChange={(event) => setEdited((current) => ({
                    ...current,
                    [key]: parseEditedValue(action.suggested_payload[key], event.target.value),
                  }))}
                />
              </label>
            ))}
          </section>
        ) : null}

        <section className="op-ai-detail-block">
          <strong>Guardrail</strong>
          <p>{action.guardrail || action.policy?.guardrail || "Nothing is sent, charged, assigned or synced until owner approval."}</p>
        </section>

        <label className="op-ai-reject-box">
          <span>Reject reason</span>
          <textarea placeholder="Optional reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>

        <div className="op-ai-drawer-actions">
          <button type="button" onClick={() => onSaveEdits?.(action, edited)} disabled={busy}>Save edits</button>
          <button type="button" className="primary" onClick={() => onApprove?.(action, edited)} disabled={busy}>{busy ? "Approving..." : "Approve"}</button>
          <button type="button" onClick={() => onReject?.(action, reason)} disabled={busy}>Reject</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </aside>
    </div>
  );
}
