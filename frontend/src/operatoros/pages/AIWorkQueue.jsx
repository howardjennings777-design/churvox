import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [autoPreparing, setAutoPreparing] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const autoRanRef = useRef(false);

  const smartHubContext = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("churvox_smart_hub_last_action") || "{}");
    } catch {
      return {};
    }
  }, []);

  const load = useCallback(async () => {
    setLoadError("");

    let nextActions = [];

    try {
      const actionPayload = await getAiActions();
      nextActions = extractActions(actionPayload);
      setActions(nextActions);
    } catch (error) {
      setLoadError(error?.message || "Could not load AI actions.");
    }

    try {
      const activityPayload = await getAiActivity();
      setActivity(extractActivity(activityPayload));
    } catch {
      setActivity([]);
    }

    return nextActions;
  }, []);

  const refreshEverything = useCallback(async () => {
    await load();

    if (typeof data?.reload === "function") {
      try {
        await data.reload();
      } catch {}
    }
  }, [data, load]);

  const runPlanAndShowActions = useCallback(
    async ({ automatic = false } = {}) => {
      if (automatic) {
        setAutoPreparing(true);
      } else {
        setBusy(true);
      }

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
            : "AI checked the business. No new owner actions found."
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
        setAutoPreparing(false);
      }
    },
    [data]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const loadedActions = await load();
      if (cancelled) return;

      const lastAutoRun = Number(sessionStorage.getItem("churvox_ai_auto_prepared_at") || "0");
      const tenMinutes = 10 * 60 * 1000;
      const recentlyRan = Date.now() - lastAutoRun < tenMinutes;

      if (!loadedActions.length && !recentlyRan && !autoRanRef.current) {
        autoRanRef.current = true;
        sessionStorage.setItem("churvox_ai_auto_prepared_at", String(Date.now()));
        await runPlanAndShowActions({ automatic: true });
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [load, runPlanAndShowActions]);

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
            AI prepares dispatch, proof-to-paid, invoice follow-up and quote follow-up actions for owner approval.
          </span>
          {smartHubContext?.source ? (
            <small>Opened from Smart Hub: {String(smartHubContext.source).replaceAll("_", " ")}</small>
          ) : null}
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => runPlanAndShowActions({ automatic: false })}
          disabled={busy || autoPreparing}
        >
          {busy || autoPreparing ? "Preparing..." : "Refresh AI work"}
        </button>
      </section>

      {autoPreparing ? <section className="op-notice">AI is preparing owner actions...</section> : null}
      {notice ? <section className="op-notice">{notice}</section> : null}
      {loadError ? <section className="op-notice">{loadError}</section> : null}

      <section className="op-queue-list">
        {!actions.length ? (
          <EmptyState
            title={autoPreparing ? "AI is preparing work" : "No AI work waiting"}
            body={
              autoPreparing
                ? "Churvox is checking jobs, quotes, invoices, proof and crew work now."
                : "AI will auto-prepare work when this page opens. You can also press Refresh AI work."
            }
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
