import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const COMMAND_API_BASE = "/api/command";

const sourceRules = [
  {
    id: "completed-job-no-invoice",
    areaGroup: "Money",
    urgency: "High",
    title: "Completed jobs need invoicing",
    found: "Churvox should look for completed jobs that have no invoice attached.",
    prepared: "Prepare invoice review slips so the owner can turn finished work into money.",
    why: "Completed work should not sit unpaid.",
    page: "invoices",
    actionType: "review_invoice",
  },
  {
    id: "overdue-invoices",
    areaGroup: "Money",
    urgency: "High",
    title: "Overdue invoices need chasing",
    found: "Churvox should look for sent invoices that are overdue or still unpaid.",
    prepared: "Prepare friendly payment reminders for owner approval.",
    why: "Cashflow improves when overdue money is followed up early.",
    page: "payments",
    actionType: "send_payment_reminder",
  },
  {
    id: "quotes-to-follow-up",
    areaGroup: "Customers",
    urgency: "Medium",
    title: "Open quotes need follow-up",
    found: "Churvox should look for quotes that have not been accepted, declined or replied to.",
    prepared: "Prepare a polite follow-up or staged option for owner approval.",
    why: "Quotes sitting open are possible work not yet won.",
    page: "quotes",
    actionType: "send_quote_followup",
  },
  {
    id: "unassigned-jobs",
    areaGroup: "Today",
    urgency: "High",
    title: "Jobs need workers assigned",
    found: "Churvox should look for upcoming jobs with no worker or owner assignment.",
    prepared: "Prepare a dispatch check so the owner can assign the right person before the job is missed.",
    why: "Unassigned jobs become customer problems fast.",
    page: "jobs",
    actionType: "assign_worker",
  },
  {
    id: "missing-client-details",
    areaGroup: "Setup",
    urgency: "Medium",
    title: "Client details are missing",
    found: "Churvox should look for clients missing phone, email, address or key notes.",
    prepared: "Prepare a missing-info action so records can be completed before quotes and invoices are sent.",
    why: "Bad customer details block messages, quotes, invoices and job scheduling.",
    page: "clients",
    actionType: "fix_missing_info",
  },
  {
    id: "setup-not-finished",
    areaGroup: "Setup",
    urgency: "High",
    title: "Setup needs finishing",
    found: "Churvox should look for missing business settings, invoice settings, first client, first job and first invoice steps.",
    prepared: "Send the owner back to the AI Guide or Settings with the exact setup step to finish.",
    why: "The app is only useful when the first real workflow is connected.",
    page: "setupassistant",
    actionType: "fix_setup_step",
  },
];

function cleanText(value) {
  return String(value || "").trim();
}

function lower(value) {
  return cleanText(value).toLowerCase();
}

function areaFor(slip) {
  const raw = `${slip?.areaGroup || ""} ${slip?.area || ""} ${slip?.group || ""} ${slip?.title || ""} ${slip?.page || ""} ${slip?.actionType || ""}`.toLowerCase();
  if (raw.includes("invoice") || raw.includes("payment") || raw.includes("cash") || raw.includes("quote") || raw.includes("money")) return "Money";
  if (raw.includes("worker") || raw.includes("job") || raw.includes("dispatch") || raw.includes("today") || raw.includes("plan")) return "Today";
  if (raw.includes("client") || raw.includes("customer") || raw.includes("message") || raw.includes("review") || raw.includes("recurring")) return "Customers";
  if (raw.includes("setup") || raw.includes("setting") || raw.includes("missing")) return "Setup";
  return "Needs approval";
}

function actionTypeFor(slip) {
  const raw = `${slip?.actionType || ""} ${slip?.title || ""} ${slip?.page || ""}`.toLowerCase();
  if (raw.includes("payment") || raw.includes("overdue")) return "send_payment_reminder";
  if (raw.includes("quote") && raw.includes("follow")) return "send_quote_followup";
  if (raw.includes("quote")) return "approve_quote";
  if (raw.includes("worker") || raw.includes("assign")) return "assign_worker";
  if (raw.includes("setup") || raw.includes("missing")) return "fix_setup_step";
  if (raw.includes("invoice")) return "review_invoice";
  if (raw.includes("message")) return "send_customer_message";
  return "owner_review";
}

function urgencyRank(value) {
  if (value === "High") return 1;
  if (value === "Medium") return 2;
  if (value === "Low") return 3;
  return 4;
}

function approveLabel(actionType) {
  const labels = {
    review_invoice: "Approve invoice check",
    send_payment_reminder: "Send reminder",
    send_quote_followup: "Send follow-up",
    approve_quote: "Approve quote action",
    assign_worker: "Open job assignment",
    fix_setup_step: "Mark setup handled",
    fix_missing_info: "Mark info handled",
    send_customer_message: "Approve message",
    owner_review: "Approve",
  };
  return labels[actionType] || "Approve";
}

function approvalResult(actionType) {
  const results = {
    review_invoice: "Owner approved invoice review.",
    send_payment_reminder: "Owner approved payment reminder.",
    send_quote_followup: "Owner approved quote follow-up.",
    approve_quote: "Owner approved quote action.",
    assign_worker: "Owner opened job assignment.",
    fix_setup_step: "Owner marked setup action handled.",
    fix_missing_info: "Owner marked missing info handled.",
    send_customer_message: "Owner approved customer message.",
    owner_review: "Owner approved this action.",
  };
  return results[actionType] || "Owner approved this action.";
}

function normalizeSlip(slip, index = 0) {
  const actionType = actionTypeFor(slip || {});
  const areaGroup = slip?.areaGroup || slip?.area || areaFor({ ...slip, actionType });
  const urgency = slip?.urgency || (lower(slip?.title).includes("overdue") ? "High" : "Medium");

  return {
    id: cleanText(slip?.id || slip?._id || slip?.dedupeKey) || `command-slip-${Date.now()}-${index}`,
    title: cleanText(slip?.title) || "Owner action ready",
    group: cleanText(slip?.group) || "Churvox",
    info: cleanText(slip?.info) || `${areaGroup} · ready for review`,
    urgency,
    areaGroup,
    actionType,
    found: cleanText(slip?.found) || "Churvox found work that needs owner attention.",
    prepared: cleanText(slip?.prepared) || "Churvox prepared the next safe action.",
    why: cleanText(slip?.why || slip?.owner) || "This keeps admin moving while the owner stays in control.",
    owner: cleanText(slip?.owner) || "Approve, edit, snooze, ignore or open the related area.",
    page: cleanText(slip?.page) || "setupassistant",
    createdAt: cleanText(slip?.createdAt) || "Today",
    status: cleanText(slip?.status) || "open",
    approvedResult: slip?.approvedResult || null,
    snoozeUntil: slip?.snoozeUntil || null,
  };
}

function isOpen(slip) {
  return ["open", "edited", ""].includes(lower(slip?.status));
}

function readLocalSlips() {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSlip) : [];
  } catch {
    return [];
  }
}

function saveLocalSlips(slips) {
  try {
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips.slice(0, 180)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command" } }));
  } catch {
    // Keep Command working.
  }
}

function makeRuleSlip(rule) {
  return normalizeSlip({
    ...rule,
    id: `rule-${rule.id}-${Date.now()}`,
    group: "Command check",
    info: `${rule.areaGroup} · source rule`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
}

async function commandRequest(path, options = {}) {
  const token = (() => {
    try { return window.localStorage.getItem("token"); } catch { return ""; }
  })();

  const response = await fetch(`${COMMAND_API_BASE}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Command check failed: ${response.status}`);
  }
  return data;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(readLocalSlips);
  const [activeGroup, setActiveGroup] = React.useState("Needs approval");
  const [message, setMessage] = React.useState("Command is watching for owner actions.");
  const [loading, setLoading] = React.useState(false);

  const enriched = React.useMemo(() => {
    return slips.map(normalizeSlip).sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  }, [slips]);

  const openSlips = enriched.filter(isOpen);
  const doneSlips = enriched.filter((slip) => !isOpen(slip));
  const important = openSlips.filter((slip) => slip.urgency === "High" || lower(slip.title).includes("overdue"));
  const money = openSlips.filter((slip) => slip.areaGroup === "Money");
  const today = openSlips.filter((slip) => slip.areaGroup === "Today");
  const setup = openSlips.filter((slip) => slip.areaGroup === "Setup");
  const nextAction = important[0] || money[0] || today[0] || setup[0] || openSlips[0] || null;
  const groups = ["Needs approval", "Money", "Today", "Customers", "Setup"];

  const visible = activeGroup === "Needs approval"
    ? openSlips
    : openSlips.filter((slip) => slip.areaGroup === activeGroup);

  const topActionCards = [important[0], money[0], today[0], setup[0], openSlips[0]]
    .filter(Boolean)
    .filter((slip, index, arr) => arr.findIndex((item) => item.id === slip.id) === index)
    .slice(0, 3);

  React.useEffect(() => {
    loadCommandData();

    const refresh = () => setSlips(readLocalSlips());
    window.addEventListener("storage", refresh);
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("churvox:fresh-data-updated", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCommandData() {
    setLoading(true);
    try {
      const data = await commandRequest("/slips");
      if (Array.isArray(data.slips)) {
        const next = data.slips.map(normalizeSlip);
        setSlips(next);
        saveLocalSlips(next);
        setMessage("Live Command loaded owner actions.");
      } else {
        setMessage("Command is ready. Run checks to look for owner actions.");
      }
    } catch {
      setMessage("Command is ready. Run checks to look for owner actions.");
    }
    setLoading(false);
  }

  async function runChecks() {
    setLoading(true);
    try {
      const data = await commandRequest("/scan", { method: "POST", body: {} });
      if (Array.isArray(data.slips) && data.slips.length) {
        const next = data.slips.map(normalizeSlip);
        setSlips(next);
        saveLocalSlips(next);
        setActiveGroup("Needs approval");
        setMessage("Command scanned real work and found owner actions.");
        setLoading(false);
        return;
      }
    } catch {
      // Use local rule checks below.
    }

    const existing = slips.map(normalizeSlip);
    const rules = sourceRules.map(makeRuleSlip);
    const next = [...rules, ...existing].slice(0, 180);
    setSlips(next);
    saveLocalSlips(next);
    setActiveGroup("Needs approval");
    setMessage("Command prepared source checks: invoices, quotes, workers, clients and setup.");
    setLoading(false);
  }

  function updateSlip(id, patch) {
    const next = slips.map((slip, index) => {
      const normal = normalizeSlip(slip, index);
      return normal.id === id ? { ...normal, ...patch } : normal;
    });
    setSlips(next);
    saveLocalSlips(next);
  }

  async function approveSlip(slip) {
    try {
      const data = await commandRequest(`/slips/${slip.id}/approve`, {
        method: "POST",
        body: { note: approvalResult(slip.actionType) },
      });
      if (data.slip) {
        const normalized = normalizeSlip(data.slip);
        const next = slips.map((item) => normalizeSlip(item).id === slip.id ? normalized : item);
        setSlips(next);
        saveLocalSlips(next);
        setMessage(`${approveLabel(slip.actionType)} saved.`);
        return;
      }
    } catch {
      // Save locally below.
    }

    updateSlip(slip.id, {
      status: "approved",
      approvedResult: approvalResult(slip.actionType),
      approvedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMessage(`${approveLabel(slip.actionType)} saved.`);
  }

  function editSlip(slip) {
    const title = window.prompt("Edit action title", slip.title);
    if (!title) return;
    const nextPrepared = window.prompt("Edit what Churvox prepared", slip.prepared) || slip.prepared;
    updateSlip(slip.id, {
      title,
      prepared: nextPrepared,
      status: "edited",
      editedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMessage("Owner edit saved.");
  }

  function snoozeSlip(slip) {
    updateSlip(slip.id, {
      status: "snoozed",
      snoozeUntil: "Tomorrow",
    });
    setMessage("Action snoozed until tomorrow.");
  }

  function ignoreSlip(slip) {
    updateSlip(slip.id, { status: "ignored" });
    setMessage("Action ignored.");
  }

  return (
    <section className="freshCommandDeskPage">
      <div className="freshCommandDeskHero">
        <div>
          <span>Command</span>
          <h1>Here is what needs doing next.</h1>
          <p>Command turns jobs, invoices, quotes, workers, customers and setup gaps into clear owner actions. Churvox prepares. You approve.</p>
        </div>

        <div className="freshCommandDeskStats">
          <div><b>{openSlips.length}</b><small>open actions</small></div>
          <div><b>{important.length}</b><small>important</small></div>
          <div><b>{money.length}</b><small>money</small></div>
          <div><b>{today.length}</b><small>today</small></div>
        </div>
      </div>

      <div className="freshCommandMorning">
        <div>
          <b>{nextAction ? nextAction.title : "Nothing urgent is waiting."}</b>
          <p>{nextAction ? nextAction.found : "Run checks when you want Command to look for invoices, quotes, workers, client details and setup gaps."}</p>
        </div>

        <div className="freshCommandMorningActions">
          <button type="button" onClick={runChecks}>{loading ? "Checking..." : "Run checks now"}</button>
          <button type="button" onClick={() => onNavigate?.("setupassistant")}>AI Guide</button>
          <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
        </div>
      </div>

      <div className="freshCommandSyncBanner live">
        <b>{loading ? "Command is checking..." : "Owner control"}</b>
        <span>{message}</span>
      </div>

      <div className="freshCommandSourcePanel">
        <div>
          <span className="freshCommandSourceBigPill">What needs doing first</span>
          <p>{nextAction ? nextAction.why : "Command will bring the next useful owner action here."}</p>
        </div>

        <div className="freshCommandSourceActions">
          {topActionCards.length ? topActionCards.map((slip) => (
            <button type="button" key={slip.id} onClick={() => setActiveGroup(slip.areaGroup || "Needs approval")}>
              <b>{slip.areaGroup}</b>
              <span>{slip.title}</span>
            </button>
          )) : (
            <button type="button" onClick={runChecks}>
              <b>Run checks</b>
              <span>Look for money, jobs, clients and setup gaps</span>
            </button>
          )}
        </div>
      </div>

      <div className="freshCommandFocusRow">
        <button type="button" onClick={() => setActiveGroup("Money")}>
          <b>Money ready</b>
          <span>{money.length} actions</span>
        </button>
        <button type="button" onClick={() => setActiveGroup("Today")}>
          <b>Plan today</b>
          <span>{today.length} actions</span>
        </button>
        <button type="button" onClick={() => setActiveGroup("Needs approval")}>
          <b>Review important</b>
          <span>{important.length} high priority</span>
        </button>
      </div>

      <div className="freshCommandTabs">
        {groups.map((group) => {
          const count = group === "Needs approval" ? openSlips.length : openSlips.filter((slip) => slip.areaGroup === group).length;
          return (
            <button
              type="button"
              key={group}
              className={activeGroup === group ? "active" : ""}
              onClick={() => setActiveGroup(group)}
            >
              <b>{group}</b>
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="freshCommandSlipList">
        {visible.length ? visible.map((slip) => (
          <article key={slip.id} className={`freshCommandSlip ${slip.urgency === "High" ? "high" : ""}`}>
            <header>
              <div>
                <span className="freshCommandAreaBadge">{slip.areaGroup}</span>
                <div className="freshCommandSlipTitle">{slip.title}</div>
                <div className="freshCommandSlipMeta">{slip.group} · {slip.info}</div>
              </div>
              <strong>{slip.urgency}</strong>
            </header>

            <div className="freshCommandSlipBody">
              <section>
                <b>Churvox found</b>
                <p>{slip.found}</p>
              </section>
              <section>
                <b>Churvox prepared</b>
                <p>{slip.prepared}</p>
              </section>
              <section>
                <b>Why it matters</b>
                <p>{slip.why}</p>
              </section>
            </div>

            <div className="freshCommandActionType">
              <b>Action type:</b>
              <span>{slip.actionType.replaceAll("_", " ")}</span>
            </div>

            <div className="freshCommandSlipControls">
              <button type="button" onClick={() => approveSlip(slip)}>{approveLabel(slip.actionType)}</button>
              <button type="button" onClick={() => editSlip(slip)}>Edit</button>
              <button type="button" onClick={() => snoozeSlip(slip)}>Snooze</button>
              <button type="button" onClick={() => ignoreSlip(slip)}>Ignore</button>
              <button type="button" onClick={() => onNavigate?.(slip.page || "setupassistant")}>Open</button>
            </div>
          </article>
        )) : (
          <div className="freshCommandEmpty">
            <b>Nothing needs approval in {activeGroup} right now.</b>
            <p>Command will show clear owner actions here: invoice this, chase that, assign this worker, complete that client detail, or approve the next message.</p>
            <button type="button" onClick={runChecks}>Run Command checks</button>
            <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
          </div>
        )}
      </div>

      {doneSlips.length > 0 && (
        <details className="freshCommandDone">
          <summary>Completed / ignored / snoozed actions ({doneSlips.length})</summary>
          <div>
            {doneSlips.slice(0, 16).map((slip) => (
              <button type="button" key={slip.id} onClick={() => updateSlip(slip.id, { status: "open", snoozeUntil: null })}>
                <b>{slip.title}</b>
                <span>{slip.status}{slip.approvedResult ? ` · ${slip.approvedResult}` : ""}{slip.snoozeUntil ? ` · until ${slip.snoozeUntil}` : ""}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
