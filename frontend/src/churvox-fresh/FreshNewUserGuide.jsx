// CHURVOX_NEW_USER_GUIDE_2_0_REAL_PROGRESS

import React from "react";
import API_BASE from "../lib/apiBase";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function fallbackProgress() {
  return {
    ok: true,
    percent: 0,
    done: 0,
    total: 5,
    dismissed: false,
    skipped: false,
    completed: false,
    counts: {},
    steps: [
      {
        key: "business_profile",
        title: "Set your business basics",
        why: "Your quotes, invoices and customer messages need the right name, GST and contact details.",
        action: "Open Settings",
        page: "settings",
        done: false,
        proof: "Waiting for setup",
        time: "1 min",
      },
      {
        key: "first_client",
        title: "Add your first real client",
        why: "Churvox becomes useful when there is a real customer, address and contact history.",
        action: "Open Clients",
        page: "clients",
        done: false,
        proof: "No client yet",
        time: "1 min",
      },
      {
        key: "first_job",
        title: "Create your first job",
        why: "This proves the main workflow: job → worker/self → complete → invoice.",
        action: "Open Jobs",
        page: "jobs",
        done: false,
        proof: "No job yet",
        time: "1 min",
      },
      {
        key: "first_invoice",
        title: "Send or prepare the first invoice",
        why: "This is the money moment. The user should see how Churvox helps them get paid.",
        action: "Open Invoices",
        page: "invoices",
        done: false,
        proof: "No invoice yet",
        time: "1 min",
      },
      {
        key: "command_approval",
        title: "Approve one thing in Command",
        why: "This teaches the product promise: Churvox does the admin. You approve.",
        action: "Open Command",
        page: "command",
        done: false,
        proof: "No Command slip yet",
        time: "30 sec",
      },
    ],
    next_step: null,
    message: "Churvox does the admin. You approve.",
  };
}

function authHeaders() {
  try {
    const token = window.localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.detail || body?.message || "Could not load guide");
  }
  return body;
}

function sendSetupHelpToCommand(progress, onNavigate) {
  const next = progress?.next_step || progress?.steps?.find((s) => !s.done) || progress?.steps?.[0];
  if (!next) return;

  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `new-user-guide-${next.key}-${Date.now()}`,
      group: "New User Guide",
      title: `Help finish setup: ${next.title}`,
      info: `${progress.percent || 0}% setup · ${next.time || "1 min"}`,
      urgency: "High",
      found: `New owner has not finished: ${next.title}.`,
      prepared: `Churvox prepared the next action: ${next.action}.`,
      why: next.why || "A new user should get their first win fast.",
      owner: "Open the step, complete it, or mark it done if already handled.",
      area: "First Run Guide",
      page: "firstrun",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 80)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "new-user-guide" } }));
  } catch {
    // Never block the guide.
  }

  onNavigate?.("command");
}

function StepPill({ step, index, active }) {
  return (
    <div className={`freshGuideStepPill ${step.done ? "done" : ""} ${active ? "active" : ""}`}>
      <span>{step.done ? "✓" : index + 1}</span>
      <div>
        <b>{step.title}</b>
        <small>{step.done ? "Done" : step.proof || step.time}</small>
      </div>
    </div>
  );
}

export default function FreshNewUserGuide({ onNavigate, mode = "compact" }) {
  const [progress, setProgress] = React.useState(fallbackProgress);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");

  const nextStep = progress.next_step || progress.steps?.find((s) => !s.done);
  const hidden = mode === "compact" && (progress.dismissed || progress.skipped) && !nextStep;

  const load = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const data = await api("/api/onboarding/progress");
      setProgress(data?.ok ? data : fallbackProgress());
    } catch (err) {
      setError(err?.message || "Guide is offline");
      setProgress((current) => current || fallbackProgress());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function markDone(stepKey) {
    if (!stepKey) return;
    setBusy(stepKey);
    try {
      const data = await api(`/api/onboarding/step/${encodeURIComponent(stepKey)}/done`, { method: "POST" });
      setProgress(data);
    } catch (err) {
      setError(err?.message || "Could not update guide");
    } finally {
      setBusy("");
    }
  }

  async function setState(patch) {
    setBusy("state");
    try {
      const data = await api("/api/onboarding/state", {
        method: "POST",
        body: JSON.stringify(patch),
      });
      setProgress(data);
    } catch (err) {
      setError(err?.message || "Could not update guide");
    } finally {
      setBusy("");
    }
  }

  if (hidden) return null;

  const steps = progress.steps || [];
  const activeKey = nextStep?.key;
  const doneText = progress.completed ? "Setup complete" : `${progress.done || 0}/${progress.total || steps.length} core steps done`;

  return (
    <section className={`freshNewUserGuide ${mode === "full" ? "full" : "compact"}`}>
      <div className="freshGuideTop">
        <div>
          <span>First Win Guide</span>
          <h2>{progress.completed ? "You’re ready to run Churvox" : "Let’s get your first win without overwhelm"}</h2>
          <p>{progress.message || "Churvox does the admin. You approve."}</p>
        </div>

        <div className="freshGuideProgress">
          <b>{progress.percent || 0}%</b>
          <small>{doneText}</small>
        </div>
      </div>

      <div className="freshGuideBar">
        <i style={{ width: `${Math.max(0, Math.min(progress.percent || 0, 100))}%` }} />
      </div>

      {error ? <div className="freshGuideError">{error}</div> : null}

      {!progress.completed && nextStep ? (
        <div className="freshGuideNext">
          <div>
            <small>Next best step · {nextStep.time}</small>
            <h3>{nextStep.title}</h3>
            <p>{nextStep.why}</p>
            <em>{nextStep.proof}</em>
          </div>

          <div className="freshGuideNextActions">
            <button type="button" className="primary" onClick={() => onNavigate?.(nextStep.page)}>
              {nextStep.action || "Open step"}
            </button>
            <button type="button" onClick={() => markDone(nextStep.key)} disabled={busy === nextStep.key}>
              {busy === nextStep.key ? "Saving..." : "I’ve done this"}
            </button>
            <button type="button" onClick={() => sendSetupHelpToCommand(progress, onNavigate)}>
              Send to Command
            </button>
          </div>
        </div>
      ) : (
        <div className="freshGuideComplete">
          <strong>Nice — the core first-run guide is complete.</strong>
          <span>Next: test a full job → invoice → paid flow.</span>
          <button type="button" onClick={() => onNavigate?.("launchcontrol")}>Open Launch Control</button>
        </div>
      )}

      <div className="freshGuideSteps">
        {steps.map((step, index) => (
          <StepPill key={step.key} step={step} index={index} active={step.key === activeKey} />
        ))}
      </div>

      {mode === "full" ? (
        <div className="freshGuideDeep">
          <article>
            <b>What this teaches</b>
            <p>New users learn the real Churvox loop: add customer, create job, finish work, send invoice, approve admin in Command.</p>
          </article>
          <article>
            <b>What it avoids</b>
            <p>No huge checklist at first login. One action, one reason, one button.</p>
          </article>
          <article>
            <b>What Churvox watches</b>
            <p>Business profile, clients, jobs, invoices, team/self setup and Command slips are checked from backend data.</p>
          </article>
        </div>
      ) : null}

      <div className="freshGuideFooter">
        <button type="button" onClick={() => load(false)} disabled={loading}>Refresh guide</button>
        {progress.dismissed || progress.skipped ? (
          <button type="button" onClick={() => setState({ resume: true })}>Resume guide</button>
        ) : (
          <>
            <button type="button" onClick={() => setState({ dismissed: true })} disabled={busy === "state"}>Hide for now</button>
            <button type="button" onClick={() => setState({ skipped: true })} disabled={busy === "state"}>Skip setup guide</button>
          </>
        )}
      </div>
    </section>
  );
}
