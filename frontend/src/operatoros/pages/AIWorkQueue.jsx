import { useCallback, useEffect, useRef, useState } from "react";
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
return String((action && (action.id || action._id || action.action_id || action.fingerprint)) || "");
}

function actionStatus(action) {
return String((action && action.status) || "pending").toLowerCase().trim();
}

function readRows(payload) {
if (Array.isArray(payload)) return payload;
if (Array.isArray(payload && payload.actions)) return payload.actions;
if (Array.isArray(payload && payload.items)) return payload.items;
if (Array.isArray(payload && payload.rows)) return payload.rows;
if (Array.isArray(payload && payload.data && payload.data.actions)) return payload.data.actions;
if (Array.isArray(payload && payload.data && payload.data.items)) return payload.data.items;
if (Array.isArray(payload && payload.data && payload.data.rows)) return payload.data.rows;
return [];
}

function normalizeAction(action, index) {
if (action === null || typeof action !== "object") return null;

const status = actionStatus(action);
if (HIDDEN_STATUSES.has(status)) return null;

const id = actionId(action) || `ai_action_${index}`;
const actionType = action.action_type || action.type || "ai_setup_task";
const safeStatus = ACTIVE_STATUSES.has(status) ? action.status || "pending" : "pending";

return {
...action,
id,
action_id: id,
action_type: actionType,
status: safeStatus,
category: action.category || actionType || "AI Operator",
title: action.title || "AI prepared action",
summary: action.summary || action.reason || "Review this AI-prepared action before anything changes.",
guardrail: action.guardrail || "Nothing is sent, assigned, charged, synced or changed without owner approval.",
priority_score: action.priority_score || action.priority || 80,
suggested_payload: action.suggested_payload || action.payload || {},
};
}

function extractActions(payload) {
return readRows(payload).map(normalizeAction).filter(Boolean);
}

function extractActivity(payload) {
if (Array.isArray(payload && payload.activity)) return payload.activity;
if (Array.isArray(payload && payload.items)) return payload.items;
if (Array.isArray(payload && payload.rows)) return payload.rows;
if (Array.isArray(payload && payload.data && payload.data.activity)) return payload.data.activity;
return [];
}

function mergeActions(first, second) {
const seen = new Set();
const output = [];

[...first, ...second].forEach((item, index) => {
const clean = normalizeAction(item, index);
if (clean === null) return;
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
async (automatic) => {
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

    const preparedCount =
      visibleActions.length ||
      Number((planResult && planResult.created) || 0) ||
      Number((planResult && planResult.briefing_summary && planResult.briefing_summary.prepared) || 0) ||
      0;

    if (preparedCount > 0) {
      setNotice(`AI prepared ${preparedCount} action${preparedCount === 1 ? "" : "s"} for owner approval.`);
    } else {
      setNotice("AI checked the business. No owner actions are waiting.");
    }

    await loadActivity();

    if (data && typeof data.reload === "function") {
      try {
        await data.reload();
      } catch {}
    }
  } catch (err) {
    setError((err && err.message) || "AI could not prepare work.");
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
} catch {}

```
let cancelled = false;

async function start() {
  setError("");

  try {
    const rows = await loadActions();
    await loadActivity();

    if (cancelled === true) return;

    if (rows.length === 0 && autoRanRef.current === false) {
      autoRanRef.current = true;
      await prepareAndLoad(true);
    }
  } catch {
    if (cancelled === false && autoRanRef.current === false) {
      autoRanRef.current = true;
      await prepareAndLoad(true);
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
if (id === "") {
setError("This AI action is missing a backend id.");
return;
}

```
setBusyActionId(id);
setError("");

try {
  const result = await approveAiAction(id, editedPayload || {});
  setSelected(null);
  setNotice((result && result.message) || "AI action approved.");
  await loadActions();
  await loadActivity();

  if (data && typeof data.reload === "function") {
    try {
      await data.reload();
    } catch {}
  }
} catch (err) {
  setError((err && err.message) || "Could not approve this AI action.");
} finally {
  setBusyActionId("");
}
```

}

async function reject(action, reason) {
const id = actionId(action);
if (id === "") {
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
  setError((err && err.message) || "Could not reject this AI action.");
} finally {
  setBusyActionId("");
}
```

}

async function saveEdits(action, editedPayload) {
const id = actionId(action);
if (id === "") {
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
  setError((err && err.message) || "Could not save edits.");
} finally {
  setBusyActionId("");
}
```

}

return ( <main className="op-workspace op-ai-work-queue"> <section className="op-workspace-head"> <div> <p>AI WORK QUEUE</p> <h1>Approve the work AI prepared for you.</h1> <span>
AI prepares dispatch, proof-to-paid, invoice follow-up and quote follow-up actions for owner approval. </span> </div>

```
    <button
      type="button"
      className="primary"
      onClick={() => prepareAndLoad(false)}
      disabled={busy}
    >
      {busy ? "Preparing..." : "Refresh AI work"}
    </button>
  </section>

  {notice ? <section className="op-notice">{notice}</section> : null}
  {error ? <section className="op-notice">{error}</section> : null}

  <section className="op-queue-list">
    {actions.length === 0 ? (
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
    open={Boolean(selected)}
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
