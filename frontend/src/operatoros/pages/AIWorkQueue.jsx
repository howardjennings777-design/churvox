import { useEffect, useState } from "react";
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

const CACHE_KEY = "churvox_ai_actions_cache";

function getId(action) {
  return action?.id || action?._id || action?.action_id || action?.fingerprint || "";
}

function getStatus(action) {
  return String(action?.status || "pending").toLowerCase();
}

function getActions(payload) {
  const rows =
    payload?.actions ||
    payload?.items ||
    payload?.rows ||
    payload?.data?.actions ||
    payload?.data?.items ||
    payload?.data?.rows ||
    [];

  if (!Array.isArray(rows)) return [];

  return rows.filter((action) => {
    if (!action || typeof action !== "object") return false;
    return !["approved", "executed", "rejected", "failed", "archived", "done"].includes(getStatus(action));
  });
}

function getActivity(payload) {
  const rows = payload?.activity || payload?.items || payload?.rows || payload?.data?.activity || [];
  return Array.isArray(rows) ? rows : [];
}

function readCache() {
  try {
    return getActions({ actions: JSON.parse(sessionStorage.getItem(CACHE_KEY) || "[]") });
  } catch {
    return [];
  }
}

function writeCache(rows) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(getActions({ actions: rows }).slice(0, 200)));
  } catch {}
}

function mergeActions(a, b) {
  const out = [];
  const seen = new Set();

  [...a, ...b].forEach((action) => {
    const id = getId(action) || `${action?.title || ""}-${action?.summary || ""}`;
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(action);
  });

  return out;
}

export default function AIWorkQueue({ data }) {
  const [actions, setActions] = useState(() => readCache());
  const [activity, setActivity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function showActions(rows) {
    if (!rows.length) return;

    setActions((current) => {
      const next = mergeActions(rows, current);
      writeCache(next);
      return next;
    });
  }

  async function loadActions() {
    setError("");

    try {
      const payload = await getAiActions();
      const rows = getActions(payload);

      if (rows.length) {
        setActions(rows);
        writeCache(rows);
        return rows;
      }

      const cached = readCache();
      if (cached.length) {
        setActions(cached);
        return cached;
      }

      return [];
    } catch (err) {
      const cached = readCache();
      if (cached.length) setActions(cached);
      setError(err?.message || "Could not load AI actions.");
      return cached;
    }
  }

  async function loadActivity() {
    try {
      const payload = await getAiActivity();
      setActivity(getActivity(payload));
    } catch {
      setActivity([]);
    }
  }

  async function prepareAiWork(auto = false) {
    setBusy(true);
    setNotice(auto ? "AI is preparing owner actions..." : "");
    setError("");

    try {
      const result = await runAiOperatorPlan();
      const returned = getActions(result);

      showActions(returned);

      const count =
        returned.length ||
        Number(result?.created || 0) ||
        Number(result?.briefing_summary?.prepared || 0) ||
        0;

      setNotice(count ? `AI prepared ${count} action${count === 1 ? "" : "s"}.` : "AI checked the business.");

      try {
        const payload = await getAiActions();
        const loaded = getActions(payload);
        if (loaded.length) showActions(loaded);
      } catch {}

      await loadActivity();

      if (typeof data?.reload === "function") {
        try {
          await data.reload();
        } catch {}
      }
    } catch (err) {
      setNotice("");
      setError(err?.message || "AI scan failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const loaded = await loadActions();
      await loadActivity();

      if (cancelled) return;

      const last = Number(sessionStorage.getItem("churvox_ai_auto_prepare_time") || "0");
      const tooSoon = Date.now() - last < 10 * 60 * 1000;

      if (!loaded.length && !tooSoon) {
        sessionStorage.setItem("churvox_ai_auto_prepare_time", String(Date.now()));
        await prepareAiWork(true);
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, []);

  function removeAction(action) {
    const id = getId(action);

    setActions((current) => {
      const next = current.filter((item) => getId(item) !== id);
      writeCache(next);
      return next;
    });
  }

  async function approve(action, edited) {
    const id = getId(action);
    if (!id) return setError("This AI action has no id.");

    setBusyId(id);
    setError("");

    try {
      const result = await approveAiAction(id, edited);
      removeAction(action);
      setSelected(null);
      setNotice(result?.message || "AI action approved.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not approve action.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(action, reason) {
    const id = getId(action);
    if (!id) return setError("This AI action has no id.");

    setBusyId(id);
    setError("");

    try {
      await rejectAiAction(id, reason);
      removeAction(action);
      setSelected(null);
      setNotice("AI action rejected.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not reject action.");
    } finally {
      setBusyId("");
    }
  }

  async function saveEdits(action, edited) {
    const id = getId(action);
    if (!id) return setError("This AI action has no id.");

    setBusyId(id);
    setError("");

    try {
      await editAiAction(id, edited);
      setNotice("Edits saved.");
      await loadActions();
    } catch (err) {
      setError(err?.message || "Could not save edits.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="op-workspace op-ai-work-queue">
      <section className="op-workspace-head">
        <div>
          <p>AI WORK QUEUE</p>
          <h1>Approve the work AI prepared for you.</h1>
          <span>AI prepares dispatch, invoice, quote and proof-to-paid actions for owner approval.</span>
        </div>

        <button className="primary" onClick={() => prepareAiWork(false)} disabled={busy}>
          {busy ? "Preparing..." : "Refresh AI work"}
        </button>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {error ? <section className="op-notice">{error}</section> : null}

      <section className="op-queue-list">
        {!actions.length ? (
          <EmptyState
            title={busy ? "AI is preparing work" : "No AI work waiting"}
            body={busy ? "Churvox is checking the business now." : "AI will prepare work automatically when needed."}
          />
        ) : (
          actions.map((action, index) => {
            const id = getId(action) || `action-${index}`;
            return (
              <ActionCard
                key={id}
                action={action}
                busy={busyId === id}
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
        busy={Boolean(busyId)}
        onSaveEdits={saveEdits}
        onApprove={approve}
        onReject={reject}
      />
    </main>
  );
}
