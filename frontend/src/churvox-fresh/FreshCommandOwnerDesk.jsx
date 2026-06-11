import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const COMMAND_API_BASE = "/api/command";
const COMMAND_MODE_KEY = "churvox:fresh-command-mode:v1";


const commandSourceRules = [
  {
    id: "source-completed-jobs",
    title: "Completed jobs with no invoice",
    area: "Money",
    actionType: "review_invoice",
    urgency: "High",
    page: "invoicecheck",
    found: "A completed job has photos/time but no invoice has been sent.",
    prepared: "Prepare invoice draft and check extras before sending.",
    why: "Completed work should become money quickly.",
  },
  {
    id: "source-overdue-invoices",
    title: "Overdue invoices",
    area: "Money",
    actionType: "send_payment_reminder",
    urgency: "High",
    page: "cashflowai",
    found: "An invoice is overdue or a payment promise has passed.",
    prepared: "Prepare a friendly reminder for owner approval.",
    why: "Cashflow improves when overdue money is followed up.",
  },
  {
    id: "source-cold-quotes",
    title: "Quotes going cold",
    area: "Money",
    actionType: "send_quote_followup",
    urgency: "Medium",
    page: "followupwriter",
    found: "A quote has not been accepted or replied to after a few days.",
    prepared: "Prepare a polite follow-up or staged option.",
    why: "Warm leads go cold quickly.",
  },
  {
    id: "source-worker-ack",
    title: "Workers not acknowledged",
    area: "Today",
    actionType: "send_worker_brief",
    urgency: "High",
    page: "workerbrief",
    found: "A worker has not acknowledged an assigned job.",
    prepared: "Prepare reminder, backup worker option or dispatch check.",
    why: "Owner should know before the customer is affected.",
  },
  {
    id: "source-missing-info",
    title: "Missing job/client/invoice info",
    area: "Setup",
    actionType: "fix_missing_info",
    urgency: "Medium",
    page: "missinginfo",
    found: "A client, job, quote or invoice is missing required details.",
    prepared: "Prepare the missing-info fix and open the right area.",
    why: "Incomplete records break workflows later.",
  },
  {
    id: "source-messages",
    title: "Customer messages",
    area: "Customers",
    actionType: "send_customer_message",
    urgency: "High",
    page: "messagetriage",
    found: "A message looks like a booking request, complaint, payment question or quote question.",
    prepared: "Triage the message and prepare a reply.",
    why: "Messages should become actions, not get buried.",
  },
  {
    id: "source-photos",
    title: "Photos uploaded",
    area: "Customers",
    actionType: "send_customer_message",
    urgency: "Medium",
    page: "photoproof",
    found: "Worker uploaded job photos.",
    prepared: "Prepare customer proof, invoice note or review request.",
    why: "Photos can build trust and support invoices.",
  },
];

const commandEventFeed = [
  {
    id: "event-1",
    title: "Worker completed Belmont lawn reset",
    time: "8:42 AM",
    type: "Job completed",
    result: "Command prepared invoice review.",
  },
  {
    id: "event-2",
    title: "Invoice INV-1007 became overdue",
    time: "9:05 AM",
    type: "Money",
    result: "Command prepared payment reminder.",
  },
  {
    id: "event-3",
    title: "Upper Hutt quote has no reply",
    time: "9:28 AM",
    type: "Quote",
    result: "Command prepared follow-up.",
  },
  {
    id: "event-4",
    title: "Customer message looks like a complaint",
    time: "10:10 AM",
    type: "Message",
    result: "Command prepared reply for approval.",
  },
];

function sourceRuleToSlip(rule) {
  return normalizeSlip({
    id: `${rule.id}-${Date.now()}`,
    group: "Command source check",
    actionType: rule.actionType,
    title: rule.title,
    info: `${rule.area} · source rule`,
    urgency: rule.urgency,
    found: rule.found,
    prepared: rule.prepared,
    why: rule.why,
    owner: "Approve, edit, snooze, ignore, or open.",
    area: rule.area,
    page: rule.page,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
}

const starterSlips = [
  {
    id: "starter-money-1",
    group: "Invoice",
    actionType: "approve_invoice_extra",
    title: "Invoice ready for approval",
    info: "Belmont Customer · $145 · possible $45 extra",
    urgency: "High",
    found: "Job was completed with photos. Worker note says extra hedge trim was completed.",
    prepared: "Invoice draft prepared with a possible extra line: Hedge trim — $45 + GST.",
    why: "This may be unbilled work. Owner should approve before sending.",
    owner: "Approve extra, edit invoice, open invoice, or ignore.",
    area: "Money",
    page: "invoicecheck",
    createdAt: "Today",
  },
  {
    id: "starter-day-1",
    group: "Today",
    actionType: "approve_day_plan",
    title: "Today’s plan is ready",
    info: "5 jobs · 1 quote · 2 worker briefs",
    urgency: "High",
    found: "Churvox found today’s work, route order and worker brief needs.",
    prepared: "Best order prepared with dispatch notes and invoice block at the end of the day.",
    why: "Owner should know what to do first without hunting through pages.",
    owner: "Approve route, edit order, open dispatch, or ignore.",
    area: "Today",
    page: "planday",
    createdAt: "Today",
  },
  {
    id: "starter-money-2",
    group: "Cashflow",
    actionType: "send_payment_reminder",
    title: "$255 overdue needs chasing",
    info: "3 invoices · friendly reminders ready",
    urgency: "High",
    found: "Three invoices are overdue by more than 7 days.",
    prepared: "Friendly payment reminders are ready for owner approval.",
    why: "Cashflow improves when overdue money is chased early.",
    owner: "Send reminders, edit, snooze, or ignore.",
    area: "Money",
    page: "cashflowai",
    createdAt: "Today",
  },
  {
    id: "starter-customer-1",
    group: "Customers",
    actionType: "send_rebooking_message",
    title: "Regular customer may be slipping",
    info: "Wainuiomata Customer · 5 weeks since last visit",
    urgency: "Medium",
    found: "Customer is past their normal booking cycle.",
    prepared: "Rebooking message prepared for next week.",
    why: "Repeat work is easier to save than new work is to win.",
    owner: "Send, edit, open client, or ignore.",
    area: "Customers",
    page: "recurringsaver",
    createdAt: "Today",
  },
  {
    id: "starter-setup-1",
    group: "Setup",
    actionType: "fix_setup_step",
    title: "Invoice settings need checking",
    info: "GST · invoice details · send flow",
    urgency: "Medium",
    found: "Invoice settings should be confirmed before launch.",
    prepared: "Open invoice checker and test invoice from completed job.",
    why: "Job to invoice to paid is the core money flow.",
    owner: "Fix now, later, open settings, or ignore.",
    area: "Setup",
    page: "setupassistant",
    createdAt: "Today",
  },
];

function getArea(slip) {
  const raw = `${slip.area || ""} ${slip.group || ""} ${slip.title || ""} ${slip.page || ""} ${slip.actionType || ""}`.toLowerCase();

  if (raw.includes("setup") || raw.includes("first run") || raw.includes("launch")) return "Setup";
  if (raw.includes("invoice") || raw.includes("cash") || raw.includes("payment") || raw.includes("price") || raw.includes("profit") || raw.includes("quote")) return "Money";
  if (raw.includes("plan") || raw.includes("worker") || raw.includes("schedule") || raw.includes("dispatch") || raw.includes("materials")) return "Today";
  if (raw.includes("customer") || raw.includes("recurring") || raw.includes("review") || raw.includes("message") || raw.includes("rework") || raw.includes("upsell")) return "Customers";
  return "Needs approval";
}

function inferActionType(slip) {
  const raw = `${slip.actionType || ""} ${slip.group || ""} ${slip.title || ""} ${slip.page || ""}`.toLowerCase();

  if (raw.includes("invoice") && raw.includes("extra")) return "approve_invoice_extra";
  if (raw.includes("invoice")) return "review_invoice";
  if (raw.includes("payment") || raw.includes("overdue") || raw.includes("cash")) return "send_payment_reminder";
  if (raw.includes("quote") && raw.includes("follow")) return "send_quote_followup";
  if (raw.includes("quote")) return "approve_quote";
  if (raw.includes("plan") || raw.includes("route")) return "approve_day_plan";
  if (raw.includes("worker") || raw.includes("brief")) return "send_worker_brief";
  if (raw.includes("setup")) return "fix_setup_step";
  if (raw.includes("recurring") || raw.includes("rebook")) return "send_rebooking_message";
  if (raw.includes("review")) return "send_review_request";
  if (raw.includes("message")) return "send_customer_message";
  if (raw.includes("missing")) return "fix_missing_info";
  return "owner_review";
}

function approveLabel(actionType) {
  const labels = {
    approve_invoice_extra: "Approve extra",
    review_invoice: "Approve invoice",
    send_payment_reminder: "Send reminder",
    send_quote_followup: "Send follow-up",
    approve_quote: "Approve quote",
    approve_day_plan: "Approve plan",
    send_worker_brief: "Send brief",
    fix_setup_step: "Mark setup fixed",
    send_rebooking_message: "Send rebook",
    send_review_request: "Send review ask",
    send_customer_message: "Send message",
    fix_missing_info: "Mark fixed",
    owner_review: "Approve",
  };
  return labels[actionType] || "Approve";
}

function approvalResult(actionType) {
  const results = {
    approve_invoice_extra: "Owner approved the invoice extra for review/send.",
    review_invoice: "Owner approved the invoice for next action.",
    send_payment_reminder: "Owner approved the payment reminder.",
    send_quote_followup: "Owner approved the quote follow-up.",
    approve_quote: "Owner approved the quote action.",
    approve_day_plan: "Owner approved today’s plan.",
    send_worker_brief: "Owner approved the worker brief.",
    fix_setup_step: "Owner marked the setup step as handled.",
    send_rebooking_message: "Owner approved the rebooking message.",
    send_review_request: "Owner approved the review request.",
    send_customer_message: "Owner approved the customer message.",
    fix_missing_info: "Owner marked missing info as handled.",
    owner_review: "Owner approved this prepared action.",
  };
  return results[actionType] || "Owner approved this prepared action.";
}

function isImportant(slip) {
  const raw = `${slip.urgency || ""} ${slip.title || ""} ${slip.group || ""} ${slip.actionType || ""} ${slip.status || ""} ${slip.info || ""}`.toLowerCase();

  if (slip.urgency === "High") return true;
  if (raw.includes("overdue")) return true;
  if (raw.includes("complaint")) return true;
  if (raw.includes("blocked")) return true;
  if (raw.includes("unacknowledged")) return true;
  if (raw.includes("needs review")) return true;
  if (raw.includes("ready to review")) return true;
  if (raw.includes("approve_invoice_extra")) return true;
  if (raw.includes("send_payment_reminder")) return true;
  if (raw.includes("approve_day_plan")) return true;
  if (raw.includes("fix_setup_step") && raw.includes("high")) return true;

  return false;
}

function normalizeSlip(slip, index = 0) {
  const actionType = inferActionType(slip || {});
  const areaGroup = getArea({ ...slip, actionType });
  return {
    id: slip.id || `command-slip-${Date.now()}-${index}`,
    group: slip.group || "Churvox",
    actionType,
    title: slip.title || "Prepared action",
    info: slip.info || slip.urgency || "Ready for owner review",
    urgency: slip.urgency || (isImportant(slip) ? "High" : "Medium"),
    found: slip.found || "Churvox found something that needs owner review.",
    prepared: slip.prepared || "Churvox prepared the next action.",
    why: slip.why || slip.owner || "This keeps admin moving while the owner stays in control.",
    owner: slip.owner || "Approve, edit, snooze, ignore, or open.",
    area: slip.area || areaGroup,
    areaGroup,
    page: slip.page || "smart",
    createdAt: slip.createdAt || "Today",
    status: slip.status || "open",
    approvedAt: slip.approvedAt || null,
    approvedResult: slip.approvedResult || null,
    snoozeUntil: slip.snoozeUntil || null,
    editedAt: slip.editedAt || null,
    audit: Array.isArray(slip.audit) ? slip.audit : [],
  };
}


function decideCommandMode(items) {
  const safeItems = Array.isArray(items) ? items.map(normalizeSlip) : [];
  const open = safeItems.filter((slip) => slip.status === "open" || slip.status === "edited");
  const setupOpen = open.filter((slip) => getArea(slip) === "Setup").length;
  const dailyOpen = open.filter((slip) => getArea(slip) !== "Setup").length;
  return setupOpen > dailyOpen ? "setup" : "daily";
}

function getInitialCommandMode(items) {
  try {
    const saved = window.localStorage.getItem(COMMAND_MODE_KEY);
    if (saved === "setup" || saved === "daily") return saved;
  } catch {
    // Preview keeps working without storage.
  }
  return decideCommandMode(items);
}

function shouldShowDemoTools() {
  try {
    return window.location.search.includes("demo") || window.localStorage.getItem("churvox:fresh-demo-mode:v1") === "on";
  } catch {
    return false;
  }
}


function normaliseBackendSlip(slip) {
  if (!slip) return null;

  return normalizeSlip({
    ...slip,
    id: slip.id || slip._id || slip.dedupeKey,
    area: slip.area || slip.areaGroup,
    areaGroup: slip.areaGroup || slip.area,
    createdAt: slip.createdAt || "Today",
  });
}

async function commandRequest(path, options = {}) {
  const init = {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (Object.prototype.hasOwnProperty.call(options, "body")) {
    init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body || {});
  }

  const response = await fetch(`${COMMAND_API_BASE}${path}`, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Command API failed: ${response.status}`);
  }

  return data;
}

function snoozeIso(label) {
  const date = new Date();

  if (label === "Tomorrow") date.setDate(date.getDate() + 1);
  if (label === "3 days") date.setDate(date.getDate() + 3);
  if (label === "Next week") date.setDate(date.getDate() + 7);
  if (label === "Later today") date.setHours(date.getHours() + 4);

  return date.toISOString();
}

function safeReadSlips() {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    const base = Array.isArray(parsed) && parsed.length ? parsed : starterSlips;
    return base.map(normalizeSlip);
  } catch {
    return starterSlips.map(normalizeSlip);
  }
}

function safeSaveSlips(slips) {
  try {
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips.slice(0, 180)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-action-lock" } }));
  } catch {
    // Preview keeps working without storage.
  }
}

function urgencyRank(urgency) {
  if (urgency === "High") return 1;
  if (urgency === "Medium") return 2;
  if (urgency === "Low") return 3;
  return 4;
}

function snoozeDate(label) {
  const date = new Date();
  if (label === "Tomorrow") date.setDate(date.getDate() + 1);
  if (label === "3 days") date.setDate(date.getDate() + 3);
  if (label === "Next week") date.setDate(date.getDate() + 7);
  if (label === "Later today") date.setHours(date.getHours() + 4);
  return date.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function safeAudit(slip) {
  return Array.isArray(slip.audit) ? slip.audit : [];
}

function auditEvent(label, patch = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    status: patch.status || "",
    result: patch.approvedResult || patch.snoozeUntil || "",
    at: new Date().toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    }),
  };
}

function latestAudit(slip) {
  const audit = safeAudit(slip);
  return audit.length ? audit[audit.length - 1] : null;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  React.useEffect(() => {
    document.body.classList.add("freshCommandOwnerMode");
    return () => document.body.classList.remove("freshCommandOwnerMode");
  }, []);

  const [slips, setSlips] = React.useState(safeReadSlips);
  const [events, setEvents] = React.useState(commandEventFeed);
  const [commandSync, setCommandSync] = React.useState({
    source: "Preview fallback",
    loading: false,
    error: "",
  });
  const [mode, setMode] = React.useState(() => getInitialCommandMode(slips));
  const [activeGroup, setActiveGroup] = React.useState("Needs approval");
  const [editing, setEditing] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    title: "",
    info: "",
    found: "",
    prepared: "",
    why: "",
    page: "",
    actionType: "",
  });
  const [snoozing, setSnoozing] = React.useState(null);

  React.useEffect(() => {
    loadCommandData();

    const refresh = () => {
      setSlips(safeReadSlips());
      loadCommandData();
    };

    window.addEventListener("storage", refresh);
    window.addEventListener("churvox:fresh-data-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("churvox:fresh-data-updated", refresh);
    };
  }, []);

  const enriched = React.useMemo(() => {
    return slips.map(normalizeSlip).sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  }, [slips]);

  const openSlips = enriched.filter((slip) => slip.status === "open" || slip.status === "edited");
  const doneSlips = enriched.filter((slip) => slip.status !== "open" && slip.status !== "edited");
  const important = openSlips.filter(isImportant);
  const money = openSlips.filter((slip) => slip.areaGroup === "Money");
  const today = openSlips.filter((slip) => slip.areaGroup === "Today");
  const setup = openSlips.filter((slip) => slip.areaGroup === "Setup");
  const showDemoTools = shouldShowDemoTools();
  const sourceRuleCount = commandSourceRules.length;
  const eventCount = events.length || commandEventFeed.length;

  const groups = ["Needs approval", "Money", "Today", "Customers", "Setup"];
  const visible = activeGroup === "Needs approval"
    ? openSlips
    : openSlips.filter((slip) => slip.areaGroup === activeGroup);


  function replaceOneSlip(nextSlip) {
    const normalized = normaliseBackendSlip(nextSlip);
    if (!normalized) return;

    setSlips((current) => {
      const currentNormal = current.map(normalizeSlip);
      const exists = currentNormal.some((slip) => slip.id === normalized.id);
      const next = exists
        ? currentNormal.map((slip) => slip.id === normalized.id ? normalized : slip)
        : [normalized, ...currentNormal];

      safeSaveSlips(next);
      return next;
    });
  }

  async function loadCommandData() {
    setCommandSync((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await commandRequest("/slips");

      if (Array.isArray(data.slips)) {
        const next = data.slips.map(normaliseBackendSlip).filter(Boolean);
        setSlips(next);
        safeSaveSlips(next);
      }

      try {
        const eventData = await commandRequest("/events");
        if (Array.isArray(eventData.events) && eventData.events.length) {
          setEvents(eventData.events);
        }
      } catch {
        // Events are optional. Slips are the important part.
      }

      setCommandSync({
        source: "Live backend",
        loading: false,
        error: "Command is loading slips from /api/command.",
      });
    } catch (error) {
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend Command API not available yet.",
      });
    }
  }

  function updateSlip(id, patch, auditLabel = null) {
    const next = slips.map((slip, index) => {
      const normal = normalizeSlip(slip, index);
      if (normal.id !== id) return normal;

      const audit = auditLabel
        ? [...safeAudit(normal), auditEvent(auditLabel, patch)].slice(-24)
        : safeAudit(normal);

      return { ...normal, ...patch, audit };
    });

    setSlips(next);
    safeSaveSlips(next);
  }

  function setOwnerMode(nextMode) {
    setMode(nextMode);
    try {
      window.localStorage.setItem(COMMAND_MODE_KEY, nextMode);
    } catch {
      // Preview keeps working without storage.
    }
  }

  function autoModeNow() {
    setOwnerMode(decideCommandMode(slips));
  }

  function clearDemo() {
    const next = starterSlips.map(normalizeSlip);
    setSlips(next);
    safeSaveSlips(next);
    setActiveGroup("Needs approval");
  }

  async function approveSlip(slip) {
    const localPatch = {
      status: "approved",
      approvedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      approvedResult: approvalResult(slip.actionType),
    };

    try {
      const data = await commandRequest(`/slips/${slip.id}/approve`, {
        method: "POST",
        body: { note: approvalResult(slip.actionType) },
      });

      if (data.slip) {
        replaceOneSlip(data.slip);
        setCommandSync({
          source: "Live backend",
          loading: false,
          error: `${approveLabel(slip.actionType)} saved to backend.`,
        });
        return;
      }
    } catch (error) {
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend approve unavailable. Saved locally.",
      });
    }

    updateSlip(slip.id, localPatch, approveLabel(slip.actionType));
  }

  function startEdit(slip) {
    setEditing(slip);
    setEditForm({
      title: slip.title || "",
      info: slip.info || "",
      found: slip.found || "",
      prepared: slip.prepared || "",
      why: slip.why || "",
      page: slip.page || "",
      actionType: slip.actionType || "owner_review",
    });
  }

  async function saveEdit() {
    if (!editing) return;

    const patch = {
      title: editForm.title || editing.title,
      info: editForm.info || editing.info,
      found: editForm.found || editing.found,
      prepared: editForm.prepared || editing.prepared,
      why: editForm.why || editing.why,
      page: editForm.page || editing.page,
      actionType: editForm.actionType || editing.actionType,
      status: "edited",
      editedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      const data = await commandRequest(`/slips/${editing.id}/edit`, {
        method: "PATCH",
        body: patch,
      });

      if (data.slip) {
        replaceOneSlip(data.slip);
        setCommandSync({
          source: "Live backend",
          loading: false,
          error: "Edit saved to backend.",
        });
      } else {
        updateSlip(editing.id, patch, "Edited prepared action");
      }
    } catch (error) {
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend edit unavailable. Saved locally.",
      });
      updateSlip(editing.id, patch, "Edited prepared action");
    }

    setEditing(null);
    setEditForm({
      title: "",
      info: "",
      found: "",
      prepared: "",
      why: "",
      page: "",
      actionType: "",
    });
  }

  async function snoozeSlip(label) {
    if (!snoozing) return;

    const localPatch = {
      status: "snoozed",
      snoozeUntil: snoozeDate(label),
    };

    try {
      const data = await commandRequest(`/slips/${snoozing.id}/snooze`, {
        method: "POST",
        body: { snoozeUntil: snoozeIso(label), note: `Snoozed ${label}` },
      });

      if (data.slip) {
        replaceOneSlip(data.slip);
        setCommandSync({
          source: "Live backend",
          loading: false,
          error: `Snoozed ${label} on backend.`,
        });
      } else {
        updateSlip(snoozing.id, localPatch, `Snoozed ${label}`);
      }
    } catch (error) {
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend snooze unavailable. Saved locally.",
      });
      updateSlip(snoozing.id, localPatch, `Snoozed ${label}`);
    }

    setSnoozing(null);
  }

  async function ignoreSlip(slip) {
    try {
      const data = await commandRequest(`/slips/${slip.id}/ignore`, {
        method: "POST",
        body: { note: "Ignored by owner" },
      });

      if (data.slip) {
        replaceOneSlip(data.slip);
        setCommandSync({
          source: "Live backend",
          loading: false,
          error: "Ignored action saved to backend.",
        });
        return;
      }
    } catch (error) {
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend ignore unavailable. Saved locally.",
      });
    }

    updateSlip(slip.id, { status: "ignored" }, "Ignored");
  }


  async function runSourceChecks() {
    setCommandSync((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await commandRequest("/scan", { method: "POST", body: {} });

      if (Array.isArray(data.slips)) {
        const next = data.slips.map(normaliseBackendSlip).filter(Boolean);
        setSlips(next);
        safeSaveSlips(next);
      }

      setActiveGroup("Needs approval");
      setCommandSync({
        source: "Live backend",
        loading: false,
        error: "Command scanned real backend sources.",
      });

      try {
        const eventData = await commandRequest("/events");
        if (Array.isArray(eventData.events) && eventData.events.length) {
          setEvents(eventData.events);
        }
      } catch {
        // Events are optional.
      }

      return;
    } catch (error) {
      const existing = slips.map(normalizeSlip);
      const generated = commandSourceRules.map(sourceRuleToSlip);
      const next = [...generated, ...existing].slice(0, 180);

      setSlips(next);
      safeSaveSlips(next);
      setActiveGroup("Needs approval");
      setCommandSync({
        source: "Preview fallback",
        loading: false,
        error: error?.message || "Backend scan unavailable. Showing preview checks.",
      });
    }
  }

  return (
    <section className="freshCommandDeskPage">
      <div className="freshCommandDeskHero">
        <div>
          <span>Command</span>
          <h1>{mode === "setup" ? "Let’s get your business ready." : "Churvox has prepared your work."}</h1>
          <p>
            {mode === "setup"
              ? "Setup mode shows what a new owner must finish before Churvox can run properly."
              : "Daily mode shows what Churvox has already prepared: money, jobs, workers, customers, risks and setup gaps."}
          </p>
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
          <b>{mode === "setup" ? "Setup Assistant" : "Churvox prepared your work for approval."}</b>
          <p>
            {mode === "setup"
              ? `${setup.length || 1} setup items need checking before launch.`
              : `${openSlips.length} open actions. ${important.length} important. ${money.length} money-related. ${today.length} for today.`}
          </p>
        </div>

        <div className="freshCommandMorningActions">
          <button type="button" onClick={() => setOwnerMode(mode === "setup" ? "daily" : "setup")}>
            {mode === "setup" ? "Daily mode" : "Setup mode"}
          </button>
          <button type="button" onClick={() => onNavigate?.("planday")}>Plan my day</button>
          <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
          <button type="button" onClick={autoModeNow}>Auto mode</button>
        </div>
      </div>


      <div className={`freshCommandSyncBanner ${commandSync.source === "Live backend" ? "live" : "preview"}`}>
        <b>{commandSync.loading ? "Syncing Command..." : commandSync.source}</b>
        <span>{commandSync.error || "Command will use backend slips when available, with preview fallback."}</span>
      </div>

      {showDemoTools && (
        <details className="freshCommandDemoTools">
          <summary>Demo tools</summary>
          <button type="button" onClick={clearDemo}>Reload sample slips</button>
        </details>
      )}


      <div className="freshCommandSourcePanel">
        <div>
          <span>Command checks</span>
          <div className="freshCommandSourceTitle" role="heading" aria-level="2">What Churvox watches for</div>
          <p>These are the real source rules Command should use: jobs, invoices, quotes, workers, messages, photos and missing setup data.</p>
        </div>

        <div className="freshCommandSourceActions">
          <b>{sourceRuleCount} source rules</b>
          <button type="button" onClick={runSourceChecks}>Run checks now</button>
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
          <article key={slip.id} className={`freshCommandSlip ${isImportant(slip) ? "high" : ""}`}>
            <header>
              <div>
                <span>{slip.areaGroup}</span>
                <h2>{slip.title}</h2>
                <small>{slip.group} · {slip.info}</small>
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

            {latestAudit(slip) && (
              <div className="freshCommandAuditNote">
                <b>Last owner action:</b>
                <span>{latestAudit(slip).label} · {latestAudit(slip).at}</span>
              </div>
            )}

            <div className="freshCommandSlipControls">
              <button type="button" onClick={() => approveSlip(slip)}>{approveLabel(slip.actionType)}</button>
              <button type="button" onClick={() => startEdit(slip)}>Edit</button>
              <button type="button" onClick={() => setSnoozing(slip)}>Snooze</button>
              <button type="button" onClick={() => ignoreSlip(slip)}>Ignore</button>
              <button type="button" onClick={() => onNavigate?.(slip.page || "smart")}>Open</button>
            </div>
          </article>
        )) : (
          <div className="freshCommandEmpty">
            <b>Nothing needs approval in {activeGroup}.</b>
            <p>Churvox will show work here when jobs, invoices, quotes, workers, messages, photos or setup items need attention.</p>
            <button type="button" onClick={runSourceChecks}>Run Command checks</button>
            <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
          </div>
        )}
      </div>


      <div className="freshCommandEventFeed">
        <header>
          <div>
            <span>Event feed</span>
            <div className="freshCommandSourceTitle" role="heading" aria-level="2">What triggered Command</div>
          </div>
          <b>{eventCount} recent events</b>
        </header>

        <div>
          {(events.length ? events : commandEventFeed).map((event) => (
            <section key={event.id}>
              <small>{event.time} · {event.type}</small>
              <b>{event.title}</b>
              <p>{event.result}</p>
            </section>
          ))}
        </div>
      </div>

      {doneSlips.length > 0 && (
        <details className="freshCommandDone">
          <summary>Completed / ignored / snoozed slips ({doneSlips.length})</summary>
          <div>
            {doneSlips.slice(0, 16).map((slip) => (
              <button type="button" key={slip.id} onClick={() => updateSlip(slip.id, { status: "open", snoozeUntil: null }, "Restored")}>
                <b>{slip.title}</b>
                <span>
                  {slip.status}
                  {slip.approvedResult ? ` · ${slip.approvedResult}` : ""}
                  {slip.snoozeUntil ? ` · until ${slip.snoozeUntil}` : ""}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}

      {editing && (
        <div className="freshCommandEditOverlay" role="dialog" aria-modal="true">
          <section>
            <header>
              <span>Edit prepared action</span>
              <h2>{editing.title}</h2>
              <p>Owner can change what Churvox prepared before approving.</p>
            </header>

            <div className="freshCommandEditGrid">
              <label>
                <span>Title</span>
                <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
              </label>

              <label>
                <span>Info line</span>
                <input value={editForm.info} onChange={(event) => setEditForm({ ...editForm, info: event.target.value })} />
              </label>

              <label>
                <span>Action type</span>
                <select value={editForm.actionType} onChange={(event) => setEditForm({ ...editForm, actionType: event.target.value })}>
                  <option value="owner_review">Owner review</option>
                  <option value="approve_invoice_extra">Approve invoice extra</option>
                  <option value="review_invoice">Review invoice</option>
                  <option value="send_payment_reminder">Send payment reminder</option>
                  <option value="send_quote_followup">Send quote follow-up</option>
                  <option value="approve_day_plan">Approve day plan</option>
                  <option value="send_worker_brief">Send worker brief</option>
                  <option value="fix_setup_step">Fix setup step</option>
                  <option value="send_rebooking_message">Send rebooking message</option>
                  <option value="send_review_request">Send review request</option>
                  <option value="fix_missing_info">Fix missing info</option>
                </select>
              </label>

              <label>
                <span>Open page</span>
                <input value={editForm.page} onChange={(event) => setEditForm({ ...editForm, page: event.target.value })} />
              </label>

              <label className="wide">
                <span>Churvox found</span>
                <textarea value={editForm.found} onChange={(event) => setEditForm({ ...editForm, found: event.target.value })} />
              </label>

              <label className="wide">
                <span>Churvox prepared</span>
                <textarea value={editForm.prepared} onChange={(event) => setEditForm({ ...editForm, prepared: event.target.value })} />
              </label>

              <label className="wide">
                <span>Why it matters</span>
                <textarea value={editForm.why} onChange={(event) => setEditForm({ ...editForm, why: event.target.value })} />
              </label>
            </div>

            <div>
              <button type="button" onClick={saveEdit}>Save edit</button>
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}

      {snoozing && (
        <div className="freshCommandEditOverlay" role="dialog" aria-modal="true">
          <section>
            <header>
              <span>Snooze action</span>
              <h2>{snoozing.title}</h2>
              <p>Choose when Churvox should bring this back.</p>
            </header>

            <div className="freshCommandSnoozeOptions">
              {["Later today", "Tomorrow", "3 days", "Next week"].map((label) => (
                <button type="button" key={label} onClick={() => snoozeSlip(label)}>{label}</button>
              ))}
            </div>

            <div>
              <button type="button" onClick={() => setSnoozing(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
