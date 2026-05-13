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

const ACTIVE_STATUSES = new Set(["pending", "ready", "needs_info", "waiting_owner"]);
const HIDDEN_STATUSES = new Set(["approved", "executed", "rejected", "failed", "archived", "done", "cancelled", "canceled"]);

function actionId(action) {
return String(action?.id || action?._id || action?.action_id || action?.fingerprint || "");
}

function actionStatus(action) {
return String(action?.status || "pending").toLowerCase().trim();
}

function normalizeAction(action, index = 0) {
if (!action || typeof action !== "object") return null;

const status = actionStatus(action);
if (HIDDEN_STATUSES.has(status)) return null;

const id = actionId(action) || `ai_action_${index}`;
const actionType = action.action_type || action.type || "ai_setup_task";

return {
...action,
id,
action_id: id,
action_type: actionType,
status: ACTIVE_STATUSES.has(status) ? action.status || "pending" : "pending",
category: action.category || actionType || "AI Operator",
title: action.title || "AI prepared action",
summary: action.summary || action.reason || "Review this AI-prepared action before anything changes.",
guardrail: action.guardrail || "Nothing is sent, assigned, charged, synced or changed without owner approval.",
priority_score: action.priority_score || action.priority || 80,
suggested_payload: action.suggested_payload || action.payload || {},
};
}

function extractActions(payload) {
const rows =
payload?.actions ||
payload?.items ||
payload?.rows ||
payload?.data?.actions ||
payload?.data?.items ||
payload?.data?.rows ||
[];

return Array.isArray(rows) ? rows.map(normalizeAction).filter(Boolean) : [];
}

function extractActivity(payload) {
const rows =
payload?.activity ||
payload?.items ||
payload?.rows ||
payload?.data?.activity ||
[];

return Array.isArray(rows) ? rows : [];
}

function mergeActions(primary, secondary) {
const seen = new Set();
const output = [];

[...primary, ...secondary].forEach((action, index) => {
const clean = normalizeAction(action, index);
if (!clean) return;
if (seen.has(clean.id)) return;
seen.add(clean.id);
output.push(clean);
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
const [error, setError] = useState("");
const autoRanRef = useRef(false);

const smartHubContext = useMemo(() => {
try {
return JSON.parse(sessionStorage.getItem("churvox_smart_hub_last_action") || "{}");
} catch {
return {};
}
}, []);

const loadActions = useCallback(async () => {
const payload = await getAiActions();
const rows = extractActions(payload);
setActions(rows);
return rows;
}, []);

const loadActivity = useCallback(async () => {
try {
const payload = await getAiActivity();
setActivity(extractActivity(payload));
} catch {
setActivity([]);
}
}, []);

const prepareAndLoad = useCallback(
async ({ automatic = false } = {}) => {
setBusy(true);
setError("");
setNotice(automatic ? "AI is preparing owner actions..." : "Refreshing AI work...");

```
  try {
    const planResult = await runAiOperatorPlan();
    const planActions = extractActions(planResult);

    let backendActions = [];
    try {
      backendActions = await loadActions();
    } catch {
      backendActions = [];
    }

    const visibleActions = mergeActions(backendActions, planActions);
    setActions(visibleActions);

    const count =
      visibleActions.length ||
      Number(planResult?.created || 0) ||
      Number(planResult?.briefing_summary?.prepared || 0) ||
      0;

    setNotice(
      count
        ? `AI prepared ${count} action${count === 1 ? "" : "s"} for owner approval.`
        : "AI checked the business. No owner actions are waiting."
    );

    await loadActivity();

    if (typeof data?.reload === "function") {
      try {
        await data.reload();
      } catch {}
    }
  } catch (err) {
    setError(err?.message || "AI could not prepare work.");
    setNotice("");
    try {
      await loadActions();
    } catch {}
    await loadActivity();
  } finally {
    setBusy(false);
  }
},
[data, loadActions, loadActivity]
```

);

useEffect(() => {
try {
localStorage.removeItem("churvox_ai_cards_fixed_final");
localStorage.removeItem("churvox_ai_queue_stable_cards");
localStorage.removeItem("churvox_ai_cards_never_disappear_v3");
localStorage.removeItem("churvox_ai_work_queue_cards_v2");
localStorage.removeItem("churvox_ai_visible_actions");
localStorage.removeItem("churvox_ai_actions_cache");
localStorage.removeItem("churvox_ai_cards_fixed_final");
} catch {}

```
let cancelled = false;

async function start() {
  setError("");
  try {
    const rows = await loadActions();
    await loadActivity();

    if (cancelled) return;

    if (!rows.length && !autoRanRef.current) {
      autoRanRef.current = true;
      await prepareAndLoad({ automatic: true });
    }
  } catch {
    if (!cancelled && !autoRanRef.current) {
      autoRanRef.current = true;
      await prepareAndLoad({ automatic: true });
    }
  }
}

start();

return () => {
  cancelled = true;
};
```

}, [loadActions, loadActivity, prepareAndLoad]);

async function approve(action, editedPayload) {
const id = actionId(action);
if (!id) {
setError("This AI action is missing a backend id.");
return;
}

```
setBusyActionId(id);
setError("");

try {
  const result = await approveAiAction(id, editedPayload || {});
  setSelected(null);
  setNotice(result?.message || "AI action approved.");
  await loadActions();
  await loadActivity();

  if (typeof data?.reload === "function") {
    try {
      await data.reload();
    } catch {}
  }
} catch (err) {
  setError(err?.message || "Could not approve this AI action.");
} finally {
  setBusyActionId("");
}
```

}

async function reject(action, reason) {
const id = actionId(action);
if (!id) {
setError("This AI action is missing a backend id.");
return;
}

```
setBusyActionId(id);
setError("");

try {
  await rejectAiAction(id, reason || "Rejected by owner");
  setSelected(null);
  setNotice("AI action rejected.");
  await loadActions();
  await loadActivity();
} catch (err) {
  setError(err?.message || "Could not reject this AI action.");
} finally {
  setBusyActionId("");
}
```

}

async function saveEdits(action, editedPayload) {
const id = actionId(action);
if (!id) {
setError("This AI action is missing a backend id.");
return;
}

```
setBusyActionId(id);
setError("");

try {
  await editAiAction(id, editedPayload || {});
  setNotice("Edits saved.");
  await loadActions();
} catch (err) {
  setError(err?.message || "Could not save edits.");
} finally {
  setBusyActionId("");
}
```

}

return ( <main className="op-workspace op-ai-work-queue"> <section className="op-workspace-head"> <div> <p>AI WORK QUEUE</p> <h1>Approve the work AI prepared for you.</h1> <span>
AI prepares dispatch, proof-to-paid, invoice follow-up and quote follow-up actions for owner approval. </span>
{smartHubContext?.source ? ( <small>Opened from Smart Hub: {String(smartHubContext.source).replaceAll("_", " ")}</small>
) : null} </div>

```
    <button
      type="button"
      className="primary"
      onClick={() => prepareAndLoad({ automatic: false })}
      disabled={busy}
    >
      {busy ? "Preparing..." : "Refresh AI work"}
    </button>
  </section>

  {notice ? <section className="op-notice">{notice}</section> : null}
  {error ? <section className="op-notice">{error}</section> : null}

  <section className="op-queue-list">
    {!actions.length ? (
      <EmptyState
        title={busy ? "AI is preparing work" : "No AI work waiting"}
        body={
          busy
            ? "Churvox is checking jobs, quotes, invoices, proof and crew work now."
            : "No backend AI actions are waiting. Press Refresh AI work to run the planner again."
        }
      />
    ) : (
      actions.map((action, index) => {
        const id = actionId(action) || `ai-action-${index}`;

        return (
          <ActionCard
            key={id}
            action={{ ...action, id }}
            busy={busyActionId === id}
            onReview={() => setSelected({ ...action, id })}
            onApprove={() => approve({ ...action, id })}
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
```

);
}
