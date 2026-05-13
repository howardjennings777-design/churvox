import { useCallback, useEffect, useMemo, useState } from "react";
import ActionCard from "../components/ActionCard";
import EmptyState from "../components/EmptyState";
import AIActionDetailDrawer from "../components/ai/AIActionDetailDrawer";
import AIActivityTimeline from "../components/ai/AIActivityTimeline";
import {
  runAiOperatorPlan,
  getAiActions,
  approveAiAction,
  rejectAiAction,
  editAiAction,
  getAiActivity,
} from "../ai/aiIntelligenceApi";

const HIDDEN_STATUSES = new Set([
  "executed",
  "approved",
  "rejected",
  "failed",
  "cancelled",
  "canceled",
  "archived",
  "done",
]);

function actionId(action) {
  return action?.id || action?._id || action?.action_id || action?.fingerprint || "";
}

function actionStatus(action) {
  return String(action?.status || "pending").toLowerCase().trim();
}

function extractActions(payload) {
  const source =
    payload?.actions ||
    payload?.items ||
    payload?.rows ||
    payload?.data?.actions ||
    payload?.data?.items ||
    payload?.data?.rows ||
    [];

  if (!Array.isArray(source)) return [];

  return source.filter((action) => {
    if (!action || typeof action !== "object") return false;
    return !HIDDEN_STATUSES.has(actionStatus(action));
  });
}

function extractActivity(payload) {
  const source =
    payload?.activity ||
    payload?.items ||
    payload?.rows ||
    payload?.data?.activity ||
    [];

  return Array.isArray(source) ? source : [];
}

function mergeActions(primary, secondary) {
  const seen = new Set();
  const output = [];

  [...primary, ...secondary].forEach((action) => {
    const id = actionId(action) || `${action?.title || ""}-${action?.summary || ""}`;
    if (!id || seen.has(id)) return;
    seen.add(id);
    output.push(action);
  });

  return output;
}

export default function AIWorkQueue({ data }) {
  const [actions, setActions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");

  const smartHubContext = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("churvox_smart_hub_last_action") || "{}");
    } catch {
      return {};
    }
  }, []);

  const load = useCallback(async () => {
    setLoadError("");

    try {
      const actionPayload = await getAiActions();
      setActions(extractActions(actionPayload));
    } catch (error) {
      setLoadError(error?.message || "Could not load AI actions.");
    }

    try {
      const activityPayload = await getAiActivity();
      setActivity(extractActivity(activityPayload));
    } catch {
      setActivity([]);
    }
  }, []);

  const refreshEverything = useCallback(async () => {
    await load();

    if (typeof data?.reload === "function") {
      try {
        await data.reload();
      } catch {}
    }
  }, [data, load]);

  useEffect(() => {
    load();
  }, [load]);

  async function scan() {
    setBusy(true);
    setNotice("");
    setLoadError("");

    try {
      const result = await runAiOperatorPlan();
      const returnedActions = extractActions(result);

      if (returnedActions.length) {
        setActions((current) => mergeActions(returnedActions, current));
      }

      const prepared =
        returnedActions.length ||
        Number(result?.created || 0) ||
        Number(result?.briefing_summary?.prepared || 0) ||
        0;

      setNotice(
        prepared
          ? `AI prepared ${prepared} action${prepared === 1 ? "" : "s"}.`
          : "AI scan complete. No new owner actions found."
      );

      try {
        const refreshed = await getAiActions();
        const refreshedActions = extractActions(refreshed);

        setActions((current) => {
          const merged = mergeActions(refreshedActions, current);
          return merged.length ? merged : current;
        });
      } catch (error) {
        setLoadError(error?.message || "AI scan worked, but reloading actions failed.");
      }

      try {
        const activityPayload = await getAiActivity();
        setActivity(extractActivity(activityPayload));
      } catch {}

      if (typeof data?.reload === "function") {
        try {
          await data.reload();
        } catch {}
      }
    } catch (error) {
      setNotice(error?.message || "AI scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(action, editedPayload) {
    const id = actionId(action);
    if (!id) {
      setNotice("This AI action is missing an id, so it cannot be approved yet.");
      return;
    }

    setBusyActionId(id);
    setNotice("");

    try {
      const result = await approveAiAction(id, editedPayload);
      setSelected(null);
      setNotice(result?.message || "AI action approved.");
      await refreshEverything();
    } catch (error) {
      setNotice(error?.message || "Could not approve this AI action.");
    } finally {
      setBusyActionId("");
    }
  }

  async function reject(action, reason) {
    const id = actionId(action);
    if (!id) {
      setNotice("This AI action is missing an id, so it cannot be rejected yet.");
      return;
    }

    setBusyActionId(id);
    setNotice("");

    try {
      await rejectAiAction(id, reason);
      setSelected(null);
      setNotice("AI action rejected.");
      await refreshEverything();
    } catch (error) {
      setNotice(error?.message || "Could not reject this AI action.");
    } finally {
      setBusyActionId("");
    }
  }

  async function saveEdits(action, editedPayload) {
    const id = actionId(action);
    if (!id) {
      setNotice("This AI action is missing an id, so edits cannot be saved yet.");
      return;
    }

    setBusyActionId(id);
    setNotice("");

    try {
      await editAiAction(id, editedPayload);
      setNotice("Edits saved.");
      await refreshEverything();
    } catch (error) {
      setNotice(error?.message || "Could not save edits.");
    } finally {
      setBusyActionId("");
    }
  }

  return (
    <main className="op-workspace op-ai-work-queue">
      <section className="op-workspace-head">
        <div>
          <p>AI WORK QUEUE</p>
          <h1>Approve the work AI prepared for you.</h1>
          <span>
            Review dispatch, proof-to-paid, invoice follow-up and quote follow-up actions before anything changes.
          </span>
          {smartHubContext?.source ? (
            <small>Opened from Smart Hub: {String(smartHubContext.source).replaceAll("_", " ")}</small>
          ) : null}
        </div>

        <button type="button" className="primary" onClick={scan} disabled={busy}>
          {busy ? "Scanning..." : "Scan business now"}
        </button>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {loadError ? <section className="op-notice">{loadError}</section> : null}

      <section className="op-queue-list">
        {!actions.length ? (
          <EmptyState
            title="No AI work waiting"
            body="Run a scan and Churvox will prepare dispatch, proof-to-paid, invoice and quote actions for owner approval."
          />
        ) : (
          actions.map((action, index) => {
            const id = actionId(action) || `ai-action-${index}`;

            return (
              <ActionCard
                key={id}
                action={action}
                busy={busyActionId === id}
                onReview={() => setSelected(action)}
                onApprove={() => approve(action)}
              />
            );
          })
        )}
      </section>

      <AIActivityTimeline items={activity} />

      <AIActionDetailDrawer
        open={!!selected}
        action={selected}
        onClose={() => setSelected(null)}
        busy={Boolean(busyActionId)}
        onSaveEdits={saveEdits}
        onApprove={approve}
        onReject={reject}
      />
    </main>
  );
}
