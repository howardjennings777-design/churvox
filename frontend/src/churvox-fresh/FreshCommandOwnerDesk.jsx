import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const COMMAND_API_BASE = "/api/command";

const sourceRules = [
  {
    id: "completed-job-no-invoice",
    areaGroup: "Money",
    urgency: "High",
    title: "Completed jobs need invoicing",
    found: "Finished work is ready to turn into money.",
    prepared: "Churvox prepared invoice review slips from completed job records.",
    why: "Completed work should not sit unpaid.",
    page: "invoices",
    actionType: "review_invoice",
  },
  {
    id: "overdue-invoices",
    areaGroup: "Money",
    urgency: "High",
    title: "Overdue invoices need chasing",
    found: "Some invoices may be overdue or still unpaid.",
    prepared: "Churvox prepared friendly payment reminders for owner approval.",
    why: "Cashflow improves when overdue money is followed up early.",
    page: "payments",
    actionType: "send_payment_reminder",
  },
  {
    id: "quotes-to-follow-up",
    areaGroup: "Customers",
    urgency: "Medium",
    title: "Open quotes need follow-up",
    found: "Open quotes are waiting for a customer decision.",
    prepared: "Churvox prepared a polite follow-up message for owner approval.",
    why: "Quotes sitting open are possible work not yet won.",
    page: "quotes",
    actionType: "send_quote_followup",
  },
  {
    id: "unassigned-jobs",
    areaGroup: "Jobs",
    urgency: "High",
    title: "Jobs need workers assigned",
    found: "Upcoming work may not have the right worker assigned yet.",
    prepared: "Churvox prepared a dispatch check so the owner can assign the right person before the job is missed.",
    why: "Unassigned jobs become customer problems fast.",
    page: "jobs",
    actionType: "assign_worker",
  },
  {
    id: "missing-job-info",
    areaGroup: "Jobs",
    urgency: "High",
    title: "Jobs are missing key info",
    found: "Some jobs may be missing price, access notes, photos, address details or worker notes.",
    prepared: "Churvox prepared missing-info slips so the job can be fixed before invoicing or dispatch.",
    why: "Bad job details slow the worker down and block clean invoicing.",
    page: "jobs",
    actionType: "fix_missing_info",
  },
  {
    id: "worker-time-review",
    areaGroup: "Workers",
    urgency: "Medium",
    title: "Worker time needs review",
    found: "Completed work or payroll records may need owner review.",
    prepared: "Churvox prepared a worker time review slip before payroll export.",
    why: "Time should be checked before it affects pay or job costing.",
    page: "payroll",
    actionType: "review_worker_time",
  },
  {
    id: "missing-client-details",
    areaGroup: "Setup",
    urgency: "Medium",
    title: "Client details are missing",
    found: "Some clients may be missing phone, email, address or key notes.",
    prepared: "Churvox prepared missing-info actions so records can be completed before messages, quotes or invoices go out.",
    why: "Bad customer details block messages, quotes, invoices and job scheduling.",
    page: "clients",
    actionType: "fix_missing_info",
  },
  {
    id: "setup-not-finished",
    areaGroup: "Setup",
    urgency: "High",
    title: "Setup needs finishing",
    found: "Business settings, invoice settings, first client, first job or first invoice steps may still be incomplete.",
    prepared: "Churvox prepared a setup action and points the owner to the exact area to finish.",
    why: "The app works best when the first real workflow is connected.",
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
  if (raw.includes("worker") || raw.includes("time") || raw.includes("payroll")) return "Workers";
  if (raw.includes("job") || raw.includes("dispatch") || raw.includes("today") || raw.includes("plan")) return "Jobs";
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
  if (raw.includes("time") || raw.includes("payroll")) return "review_worker_time";
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
    review_invoice: "Approve invoice",
    send_payment_reminder: "Send reminder",
    send_quote_followup: "Send follow-up",
    approve_quote: "Approve quote action",
    assign_worker: "Open job assignment",
    review_worker_time: "Approve time review",
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
    review_worker_time: "Owner approved worker time review.",
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
    group: cleanText(slip?.group) || "Churvox prepared",
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
    group: "Churvox prepared",
    info: `${rule.areaGroup} · ready to review`,
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
  const [selectedId, setSelectedId] = React.useState(null);
  const [message, setMessage] = React.useState("Churvox is ready to prepare owner actions.");
  const [loading, setLoading] = React.useState(false);

  const enriched = React.useMemo(() => {
    return slips.map(normalizeSlip).sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  }, [slips]);

  const openSlips = enriched.filter(isOpen);
  const doneSlips = enriched.filter((slip) => !isOpen(slip));
  const selected = enriched.find((slip) => slip.id === selectedId) || null;

  const preparedTrays = [
    {
      id: "money",
      label: "Money ready",
      subline: "Invoices, payments and quote value",
      empty: "No money actions prepared yet.",
      items: openSlips.filter((slip) => slip.areaGroup === "Money"),
    },
    {
      id: "jobs",
      label: "Missing job info",
      subline: "Price, access, photos, worker or job notes",
      empty: "No job gaps prepared yet.",
      items: openSlips.filter((slip) => slip.areaGroup === "Jobs"),
    },
    {
      id: "customers",
      label: "Customer follow-ups",
      subline: "Quotes, messages and customer replies",
      empty: "No customer follow-ups prepared yet.",
      items: openSlips.filter((slip) => slip.areaGroup === "Customers"),
    },
    {
      id: "workers",
      label: "Worker + time",
      subline: "Assignments, route checks and time review",
      empty: "No worker actions prepared yet.",
      items: openSlips.filter((slip) => slip.areaGroup === "Workers" || slip.actionType === "assign_worker" || slip.actionType === "review_worker_time"),
    },
    {
      id: "setup",
      label: "Setup gaps",
      subline: "Business, client and invoice setup",
      empty: "No setup gaps prepared yet.",
      items: openSlips.filter((slip) => slip.areaGroup === "Setup"),
    },
    {
      id: "important",
      label: "Important now",
      subline: "High priority work Churvox prepared",
      empty: "Nothing urgent prepared yet.",
      items: openSlips.filter((slip) => slip.urgency === "High"),
    },
  ];

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
        setMessage("Churvox loaded prepared owner actions.");
      } else {
        setMessage("Run checks and Churvox will prepare the owner actions.");
      }
    } catch {
      setMessage("Run checks and Churvox will prepare the owner actions.");
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
        setMessage("Churvox scanned the work and prepared owner actions.");
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
    setMessage("Churvox prepared trays for money, job gaps, follow-ups, workers and setup.");
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
        setSelectedId(null);
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
    setSelectedId(null);
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
    setSelectedId(null);
    setMessage("Action snoozed until tomorrow.");
  }

  function ignoreSlip(slip) {
    updateSlip(slip.id, { status: "ignored" });
    setSelectedId(null);
    setMessage("Action ignored.");
  }

  return (
    <section className="freshCommandDeskPage freshCommandPreparedPage">
      <div className="freshCommandDeskHero freshCommandPreparedHero">
        <div>
          <span>Command</span>
          <h1>Churvox prepared this for you.</h1>
          <p>Open a tray, review what Churvox found, then approve, edit, snooze or ignore. Every box is an owner decision, not another page to hunt through.</p>
        </div>

        <div className="freshCommandPreparedSummary">
          <button type="button" onClick={runChecks}>{loading ? "Preparing..." : "Run Command checks"}</button>
          <small>{message}</small>
          <b>{openSlips.length} open · {doneSlips.length} handled</b>
        </div>
      </div>

      <section className="freshPreparedTrayGrid">
        {preparedTrays.map((tray) => (
          <article className={`freshPreparedTray freshPreparedTray-${tray.id}`} key={tray.id}>
            <header>
              <div>
                <span>Churvox prepared</span>
                <h2>{tray.label}</h2>
                <p>{tray.subline}</p>
              </div>
              <strong>{tray.items.length}</strong>
            </header>

            <div className="freshPreparedTrayList">
              {tray.items.slice(0, 3).map((slip) => (
                <button type="button" key={slip.id} onClick={() => setSelectedId(slip.id)}>
                  <b>{slip.title}</b>
                  <span>{slip.info}</span>
                  <em>{slip.urgency} · Open prepared slip</em>
                </button>
              ))}

              {tray.items.length === 0 && (
                <div className="freshPreparedEmpty">
                  <b>{tray.empty}</b>
                  <span>Run checks to let Churvox prepare this tray.</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      {doneSlips.length > 0 && (
        <details className="freshCommandDone freshPreparedDone">
          <summary>Handled actions ({doneSlips.length})</summary>
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

      {selected && (
        <div className="freshSlipOverlay freshPreparedOverlay" onClick={() => setSelectedId(null)}>
          <section className="freshSlipModal freshPreparedModal" onClick={(event) => event.stopPropagation()}>
            <header className="freshSlipHead">
              <span>{selected.areaGroup}</span>
              <h2>{selected.title}</h2>
              <p>{selected.info}</p>
            </header>

            <div className="freshSlipBody freshPreparedSlipBody">
              <div className="freshSlipRow">
                <b>Churvox found</b>
                <p>{selected.found}</p>
              </div>

              <div className="freshSlipRow">
                <b>Churvox prepared</b>
                <p>{selected.prepared}</p>
              </div>

              <div className="freshSlipRow">
                <b>Why it matters</b>
                <p>{selected.why}</p>
              </div>

              <div className="freshSlipRow">
                <b>Owner action</b>
                <p>{selected.owner}</p>
              </div>

              <div className="freshSlipActions">
                <button className="freshPrimary" onClick={() => approveSlip(selected)}>{approveLabel(selected.actionType)}</button>
                <button className="freshDark" onClick={() => editSlip(selected)}>Edit prepared action</button>
                <button className="freshGhost" onClick={() => snoozeSlip(selected)}>Snooze</button>
                <button className="freshGhost" onClick={() => ignoreSlip(selected)}>Ignore</button>
                <button className="freshOrange" onClick={() => onNavigate?.(selected.page || "setupassistant")}>Open area</button>
              </div>

              <button type="button" className="freshClose" onClick={() => setSelectedId(null)}>
                Close slip
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
