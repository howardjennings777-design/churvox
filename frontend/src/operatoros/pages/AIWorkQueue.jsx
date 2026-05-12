import { useMemo, useState } from "react";
import { addActivity, apiFetch, saveOperatorDraft, tryApi, readLocalList } from "../api";
import ActionCard from "../components/ActionCard";
import DetailDrawer from "../components/DetailDrawer";
import EmptyState from "../components/EmptyState";
import { buildAiActions } from "./aiActions";
import { prioritiseAiActions } from "./aiCommandCore";

function normaliseBackendAction(action) {
  return {
    ...action,
    id: action.id || action._id || action.action_key,
    type: action.category || action.type || action.action_type || "AI",
    execute: action.action_type || action.execute,
    fields: action.suggested_payload || action.fields || {},
    summary: action.summary || action.description || "",
    risk: action.risk || action.risk_level || "low",
    backend_action: true,
  };
}

async function executeAction(action, fields) {
  if (action?.backend_action && action?.id) {
    const result = await apiFetch(`/ai/operator/actions/${action.id}/approve`, {
      method: "POST",
    });

    return result?.message || "AI action approved and executed.";
  }

  if (action.execute === "draft_invoice") {
    await tryApi(["/invoices", "/invoices/create"], {
      method: "POST",
      body: {
        job_id: fields.job_id,
        client_name: fields.client_name,
        customer_name: fields.client_name,
        amount: Number(fields.amount || 0),
        total: Number(fields.amount || 0),
        description: fields.description,
        status: "draft",
        created_by_ai: true,
        source: "operator_queue",
      },
    });

    return "Draft invoice created.";
  }

  if (action.execute === "assign_worker" && fields.job_id) {
    const body = {
      worker_id: fields.worker_id,
      assigned_worker_id: fields.worker_id,
      assigned_worker_name: fields.worker_name,
      ai_match_score: fields.worker_score,
      ai_match_reasons: fields.match_reasons,
      ai_possible_conflict: fields.possible_conflict,
    };

    try {
      await tryApi([`/jobs/${fields.job_id}/assign`, `/jobs/${fields.job_id}/assign-worker`], {
        method: "POST",
        body,
      });
    } catch {
      await tryApi([`/jobs/${fields.job_id}`], {
        method: "PATCH",
        body,
      });
    }

    return "Worker assignment submitted.";
  }

  if (String(action.execute || "").startsWith("open_")) {
    saveOperatorDraft({
      ...action,
      fields,
      status: "owner_needs_to_review_workspace",
    });

    return "Saved as an owner-review setup action.";
  }

  saveOperatorDraft({
    ...action,
    fields,
    status: "draft_waiting_owner",
  });

  return "Saved as an owner-review draft.";
}

export default function AIWorkQueue({ data }) {
  const actions = useMemo(() => {
    const backendActions = Array.isArray(data.aiActions)
      ? data.aiActions.map(normaliseBackendAction)
      : [];

    if (backendActions.length) {
      return prioritiseAiActions(backendActions);
    }

    return prioritiseAiActions(buildAiActions(data));
  }, [data]);

  const [selected, setSelected] = useState(null);
  const [edited, setEdited] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  function review(action) {
    setSelected(action);
    setEdited(action.fields || {});
    setNotice("");
  }

  async function runOperator() {
    setBusy("run-ai-operator");
    setNotice("");

    try {
      const result = await apiFetch("/ai/operator/run", { method: "POST" });
      await data.reload?.();
      setNotice(
        `AI Operator ran. Prepared ${result?.prepared ?? 0}, created ${result?.created ?? 0}, updated ${result?.updated ?? 0}.`
      );
    } catch (error) {
      setNotice(error.message || "AI Operator run failed.");
    } finally {
      setBusy("");
    }
  }

  async function rejectAction(action) {
    if (!action) return;

    if (!action.backend_action) {
      addActivity({
        type: "dismissed",
        title: action.title,
        message: "Owner dismissed AI action.",
      });
      setSelected(null);
      return;
    }

    setBusy(action.id);
    setNotice("");

    try {
      const result = await apiFetch(`/ai/operator/actions/${action.id}/reject`, {
        method: "POST",
      });

      addActivity({
        type: "rejected",
        title: action.title,
        message: result?.message || "AI action rejected.",
      });

      await data.reload?.();
      setNotice(result?.message || "AI action rejected.");
      setSelected(null);
    } catch (error) {
      setNotice(error.message || "Could not reject action.");
    } finally {
      setBusy("");
    }
  }

  async function approve(action, fields = action.fields || {}) {
    if (!action || busy) return;

    setBusy(action.id);
    setNotice("");

    try {
      const message = await executeAction(action, fields);

      addActivity({
        type: "approved",
        title: action.title,
        message,
      });

      setNotice(message);
      setSelected(null);
      await data.reload?.();
    } catch (error) {
      saveOperatorDraft({
        ...action,
        fields,
        status: "backend_needs_review",
        error: error.message,
      });

      addActivity({
        type: "fallback",
        title: action.title,
        message: "Backend rejected action, saved as draft.",
      });

      setNotice("Backend did not accept this yet, so Churvox saved it as an owner-review draft.");
    } finally {
      setBusy("");
    }
  }

  async function approveAllSafe() {
    const safeActions = actions.filter((x) => String(x.risk).toLowerCase() === "low");

    for (const action of safeActions) {
      await approve(action, action.fields || {});
    }

    if (!safeActions.length) {
      setNotice("No low-risk actions are ready for approve all.");
    }
  }

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>AI WORK QUEUE</p>
          <h1>Review, edit and approve AI-prepared work.</h1>
          <span>AI does the admin prep. The owner stays in control.</span>
        </div>

        <button type="button" disabled={busy === "run-ai-operator"} onClick={runOperator}>
          {busy === "run-ai-operator" ? "Running..." : "Run AI Operator"}
        </button>

        <button disabled={!actions.some((x) => String(x.risk).toLowerCase() === "low")} onClick={approveAllSafe}>
          Approve all safe
        </button>
      </section>

      <section className="op-guardrails">
        <strong>Owner approval guardrails</strong>
        <span>
          AI cannot send messages, charge customers, delete records, sync MYOB, change payroll, change prices,
          invite/remove workers or change billing without approval.
        </span>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}

      <section className="op-queue-list">
        {!actions.length ? (
          <EmptyState
            title="No approvals waiting"
            body="Create jobs, invoices, quotes or import clients/crew and Churvox will prepare work here."
          />
        ) : (
          actions.map((action) => (
            <ActionCard key={action.id} action={action} onReview={review} onApprove={approve} />
          ))
        )}
      </section>

      <section className="op-card">
        <h3>AI Activity Log</h3>
        <div className="op-mini-list">
          {readLocalList("churvox_operator_activity_log").slice(0, 6).map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <small>{row.message}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <DetailDrawer
        open={!!selected}
        title={selected?.title}
        eyebrow={selected?.type}
        onClose={() => setSelected(null)}
        footer={
          <>
            <button type="button" onClick={() => rejectAction(selected)}>
              {selected?.backend_action ? "Reject" : "Dismiss"}
            </button>

            <button
              type="button"
              className="primary"
              disabled={busy === selected?.id}
              onClick={() => approve(selected, edited)}
            >
              {busy === selected?.id ? "Approving..." : "Approve edited action"}
            </button>
          </>
        }
      >
        <section className="op-note">
          <strong>Why AI prepared this</strong>
          {(selected?.why || [selected?.summary]).filter(Boolean).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <small>{selected?.guardrail}</small>
        </section>

        <form className="op-form">
          {Object.entries(edited || {}).map(([key, value]) => (
            <label key={key}>
              <span>{key.replaceAll("_", " ")}</span>
              {String(value || "").length > 70 ? (
                <textarea
                  rows={4}
                  value={value || ""}
                  onChange={(event) => setEdited((current) => ({ ...current, [key]: event.target.value }))}
                />
              ) : (
                <input
                  value={value || ""}
                  onChange={(event) => setEdited((current) => ({ ...current, [key]: event.target.value }))}
                />
              )}
            </label>
          ))}
        </form>
      </DetailDrawer>
    </main>
  );
}
