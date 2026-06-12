import React from "react";
import "./freshPreparedCommandDesk.css";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const COMMAND_API_BASE = "/api/command";

const sourceRules = [
  {
    id: "completed-job-no-invoice",
    areaGroup: "Money",
    urgency: "High",
    title: "Completed jobs need invoicing",
    found: "Finished work is ready to turn into money.",
    prepared: "Invoice form prepared for owner approval.",
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
    prepared: "Payment reminder form prepared for owner approval.",
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
    prepared: "Quote follow-up form prepared for owner approval.",
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
    prepared: "Worker assignment form prepared for owner approval.",
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
    prepared: "Job info form prepared so the missing details can be fixed here.",
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
    prepared: "Worker time form prepared before payroll export.",
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
    prepared: "Client detail form prepared before messages, quotes or invoices go out.",
    why: "Bad customer details block messages, quotes, invoices and job scheduling.",
    page: "clients",
    actionType: "fix_client_info",
  },
  {
    id: "setup-not-finished",
    areaGroup: "Setup",
    urgency: "High",
    title: "Setup needs finishing",
    found: "Business settings, invoice settings, first client, first job or first invoice steps may still be incomplete.",
    prepared: "Setup checklist form prepared for owner approval.",
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
  if (raw.includes("client") && raw.includes("missing")) return "fix_client_info";
  if (raw.includes("worker") || raw.includes("assign")) return "assign_worker";
  if (raw.includes("time") || raw.includes("payroll")) return "review_worker_time";
  if (raw.includes("setup")) return "fix_setup_step";
  if (raw.includes("missing")) return "fix_missing_info";
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
    send_payment_reminder: "Approve reminder",
    send_quote_followup: "Approve follow-up",
    approve_quote: "Approve quote",
    assign_worker: "Approve assignment",
    review_worker_time: "Approve time",
    fix_setup_step: "Approve setup fix",
    fix_missing_info: "Approve job fix",
    fix_client_info: "Approve client fix",
    send_customer_message: "Approve message",
    owner_review: "Approve",
  };
  return labels[actionType] || "Approve";
}

function normalizeSlip(slip, index = 0) {
  const actionType = actionTypeFor(slip || {});
  const areaGroup = slip?.areaGroup || slip?.area || areaFor({ ...slip, actionType });
  const urgency = slip?.urgency || (lower(slip?.title).includes("overdue") ? "High" : "Medium");
  return {
    id: cleanText(slip?.id || slip?._id || slip?.dedupeKey) || `command-slip-${Date.now()}-${index}`,
    title: cleanText(slip?.title) || "Owner action ready",
    group: cleanText(slip?.group) || "Prepared",
    info: cleanText(slip?.info) || `${areaGroup} · ready for review`,
    urgency,
    areaGroup,
    actionType,
    found: cleanText(slip?.found) || "Work needs owner attention.",
    prepared: cleanText(slip?.prepared) || "The form is ready for review.",
    why: cleanText(slip?.why || slip?.owner) || "This keeps admin moving while the owner stays in control.",
    owner: cleanText(slip?.owner) || "Review the form, edit anything needed, then approve.",
    page: cleanText(slip?.page) || "setupassistant",
    createdAt: cleanText(slip?.createdAt) || "Today",
    status: cleanText(slip?.status) || "open",
    approvedResult: slip?.approvedResult || null,
    snoozeUntil: slip?.snoozeUntil || null,
    draft: slip?.draft || null,
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
  } catch {}
}

function makeRuleSlip(rule) {
  return normalizeSlip({
    ...rule,
    id: `rule-${rule.id}-${Date.now()}`,
    group: "Prepared",
    info: `${rule.areaGroup} · ready to review`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
}

function makeStarterSlips() {
  return sourceRules.map(makeRuleSlip);
}

function field(key, label, value = "", type = "text", wide = false) {
  return { key, label, value, type, wide };
}

function defaultFieldsFor(slip) {
  const today = new Date().toISOString().slice(0, 10);
  const actionType = slip?.actionType || "owner_review";
  const map = {
    review_invoice: {
      actionLabel: "Invoice ready to approve",
      approveResult: "Invoice form approved by owner.",
      fields: [
        field("customer", "Customer", "Customer from completed job"),
        field("job", "Job", "Completed job"),
        field("invoiceNumber", "Invoice number", "Draft"),
        field("amount", "Amount", "Review price", "text"),
        field("gst", "GST", "15% if applicable"),
        field("dueDate", "Due date", today, "date"),
        field("serviceLine", "Service line", "Completed service work", "textarea", true),
        field("invoiceNote", "Invoice note", "Thanks for your business. Please let us know if you need anything else.", "textarea", true),
      ],
    },
    send_payment_reminder: {
      actionLabel: "Payment reminder ready",
      approveResult: "Payment reminder approved by owner.",
      fields: [
        field("customer", "Customer", "Customer with overdue invoice"),
        field("invoice", "Invoice", "Overdue invoice"),
        field("amountDue", "Amount due", "Review amount"),
        field("sendBy", "Send by", "Email / SMS"),
        field("message", "Reminder message", "Hi, just a friendly reminder that this invoice is still showing as unpaid. Please let us know if you need anything resent. Thanks.", "textarea", true),
      ],
    },
    send_quote_followup: {
      actionLabel: "Quote follow-up ready",
      approveResult: "Quote follow-up approved by owner.",
      fields: [
        field("customer", "Customer", "Customer with open quote"),
        field("quote", "Quote", "Open quote"),
        field("quoteValue", "Quote value", "Review value"),
        field("sendBy", "Send by", "Email / SMS"),
        field("message", "Follow-up message", "Hi, just checking in on the quote we sent through. Happy to answer any questions or book the work in when you are ready.", "textarea", true),
      ],
    },
    assign_worker: {
      actionLabel: "Worker assignment ready",
      approveResult: "Worker assignment approved by owner.",
      fields: [
        field("job", "Job", "Upcoming job"),
        field("worker", "Worker", "Choose worker"),
        field("date", "Date", today, "date"),
        field("timeWindow", "Time window", "Review time"),
        field("address", "Address", "Job address", "text", true),
        field("workerNotes", "Worker notes", "Check access, photos required, customer notes and safety details before starting.", "textarea", true),
      ],
    },
    fix_missing_info: {
      actionLabel: "Job info fix ready",
      approveResult: "Missing job information approved by owner.",
      fields: [
        field("job", "Job", "Job missing details"),
        field("price", "Price", "Add price"),
        field("worker", "Worker", "Assign or confirm worker"),
        field("priority", "Priority", "High"),
        field("missingDetails", "Missing details", "Price, access notes, address, customer contact, photos or completion notes.", "textarea", true),
        field("ownerFix", "Owner fix", "Enter the missing information, then approve this fix.", "textarea", true),
      ],
    },
    fix_client_info: {
      actionLabel: "Client details ready",
      approveResult: "Client detail fix approved by owner.",
      fields: [
        field("client", "Client", "Client missing details"),
        field("phone", "Phone", "Add phone"),
        field("email", "Email", "Add email", "email"),
        field("address", "Address", "Add address", "text", true),
        field("notes", "Client notes", "Access notes, preferred contact method, gate codes or billing notes.", "textarea", true),
      ],
    },
    review_worker_time: {
      actionLabel: "Worker time ready",
      approveResult: "Worker time approved by owner.",
      fields: [
        field("worker", "Worker", "Worker name"),
        field("job", "Job", "Completed job"),
        field("date", "Date", today, "date"),
        field("start", "Start", "Start time"),
        field("finish", "Finish", "Finish time"),
        field("total", "Total", "Review hours"),
        field("adjustment", "Adjustment note", "Check pauses, travel, manual edits or extras before payroll export.", "textarea", true),
      ],
    },
    fix_setup_step: {
      actionLabel: "Setup fix ready",
      approveResult: "Setup fix approved by owner.",
      fields: [
        field("area", "Area", "Business setup"),
        field("missingStep", "Missing step", "Business details / invoice settings / first client / first job"),
        field("ownerInput", "What needs entering", "Complete the missing setup details so Command can prepare better work.", "textarea", true),
        field("notes", "Notes", "Mark this handled once the setup gap is sorted.", "textarea", true),
      ],
    },
    owner_review: {
      actionLabel: "Owner review ready",
      approveResult: "Prepared action approved by owner.",
      fields: [
        field("action", "Action", slip?.title || "Owner action"),
        field("details", "Details", slip?.prepared || "Review and approve the prepared action.", "textarea", true),
      ],
    },
  };
  return map[actionType] || map.owner_review;
}

function buildPreparedDraft(slip) {
  if (!slip) return null;
  if (slip.draft?.fields) return { ...slip.draft, fields: slip.draft.fields.map((item) => ({ ...item })) };
  const base = defaultFieldsFor(slip);
  return {
    actionType: slip.actionType,
    actionLabel: base.actionLabel,
    approveResult: base.approveResult,
    title: slip.title,
    found: slip.found,
    why: slip.why,
    fields: base.fields,
  };
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
  if (!response.ok || data?.ok === false) throw new Error(data?.message || `Command check failed: ${response.status}`);
  return data;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(readLocalSlips);
  const [selectedId, setSelectedId] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [message, setMessage] = React.useState("Ready to prepare owner actions.");
  const [loading, setLoading] = React.useState(false);

  const enriched = React.useMemo(() => slips.map(normalizeSlip).sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency)), [slips]);
  const openSlips = enriched.filter(isOpen);
  const doneSlips = enriched.filter((slip) => !isOpen(slip));
  const selected = enriched.find((slip) => slip.id === selectedId) || null;

  React.useEffect(() => {
    setDraft(selected ? buildPreparedDraft(selected) : null);
  }, [selectedId, selected?.id]);

  const preparedTrays = [
    { id: "money", label: "Money ready", subline: "Invoices, payments and quote value", empty: "No money actions prepared yet.", items: openSlips.filter((slip) => slip.areaGroup === "Money") },
    { id: "jobs", label: "Missing job info", subline: "Price, access, photos, worker or job notes", empty: "No job gaps prepared yet.", items: openSlips.filter((slip) => slip.areaGroup === "Jobs") },
    { id: "customers", label: "Customer follow-ups", subline: "Quotes, messages and customer replies", empty: "No customer follow-ups prepared yet.", items: openSlips.filter((slip) => slip.areaGroup === "Customers") },
    { id: "workers", label: "Worker + time", subline: "Assignments, route checks and time review", empty: "No worker actions prepared yet.", items: openSlips.filter((slip) => slip.areaGroup === "Workers" || slip.actionType === "assign_worker" || slip.actionType === "review_worker_time") },
    { id: "setup", label: "Setup gaps", subline: "Business, client and invoice setup", empty: "No setup gaps prepared yet.", items: openSlips.filter((slip) => slip.areaGroup === "Setup") },
    { id: "important", label: "Important now", subline: "High priority work", empty: "Nothing urgent prepared yet.", items: openSlips.filter((slip) => slip.urgency === "High") },
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
  }, []);

  async function loadCommandData() {
    setLoading(true);
    try {
      const data = await commandRequest("/slips");
      if (Array.isArray(data.slips) && data.slips.length) {
        const next = data.slips.map(normalizeSlip);
        setSlips(next);
        saveLocalSlips(next);
        setMessage("Loaded owner actions.");
        setLoading(false);
        return;
      }
    } catch {}
    const local = readLocalSlips();
    if (local.length) {
      setSlips(local);
      setMessage("Loaded owner actions.");
    } else {
      const starter = makeStarterSlips();
      setSlips(starter);
      saveLocalSlips(starter);
      setMessage("Starting trays are ready.");
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
        setMessage("Owner actions updated.");
        setLoading(false);
        return;
      }
    } catch {}
    const next = [...sourceRules.map(makeRuleSlip), ...slips.map(normalizeSlip)].slice(0, 180);
    setSlips(next);
    saveLocalSlips(next);
    setMessage("Owner actions updated.");
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

  function updateDraftField(key, value) {
    setDraft((current) => ({
      ...(current || buildPreparedDraft(selected)),
      fields: (current?.fields || []).map((item) => item.key === key ? { ...item, value } : item),
    }));
  }

  function saveDraftEdit() {
    if (!selected || !draft) return;
    updateSlip(selected.id, {
      draft,
      title: draft.title || selected.title,
      status: "edited",
      editedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMessage("Edit saved in Command.");
  }

  async function approveSlip(slip, preparedDraft = null) {
    const finalDraft = preparedDraft || buildPreparedDraft(slip);
    const result = finalDraft?.approveResult || "Prepared form approved by owner.";
    try {
      const data = await commandRequest(`/slips/${slip.id}/approve`, {
        method: "POST",
        body: { note: result, draft: finalDraft },
      });
      if (data.slip) {
        const normalized = normalizeSlip({ ...data.slip, draft: finalDraft, approvedResult: result });
        const next = slips.map((item) => normalizeSlip(item).id === slip.id ? normalized : item);
        setSlips(next);
        saveLocalSlips(next);
        setSelectedId(null);
        setMessage(`${approveLabel(slip.actionType)} saved.`);
        return;
      }
    } catch {}
    updateSlip(slip.id, {
      status: "approved",
      draft: finalDraft,
      approvedResult: result,
      approvedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setSelectedId(null);
    setMessage(`${approveLabel(slip.actionType)} saved.`);
  }

  function snoozeSlip(slip) {
    updateSlip(slip.id, { status: "snoozed", snoozeUntil: "Tomorrow", draft });
    setSelectedId(null);
    setMessage("Action snoozed until tomorrow.");
  }

  function ignoreSlip(slip) {
    updateSlip(slip.id, { status: "ignored", draft });
    setSelectedId(null);
    setMessage("Action ignored.");
  }

  return (
    <section className="freshCommandDeskPage freshCommandPreparedPage">
      <div className="freshCommandDeskHero freshCommandPreparedHero">
        <div>
          <span>Command</span>
          <h1>Churvox prepared this for you.</h1>
          <p>Open a tray, check the filled form, edit in place, then approve. You only open another area when you really need to.</p>
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
                <span>Prepared</span>
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
                  <em>{slip.urgency} · open form</em>
                </button>
              ))}
              {tray.items.length === 0 && <div className="freshPreparedEmpty"><b>{tray.empty}</b><span>Command will keep watching this area.</span></div>}
            </div>
          </article>
        ))}
      </section>

      {doneSlips.length > 0 && (
        <details className="freshCommandDone freshPreparedDone">
          <summary>Handled actions ({doneSlips.length})</summary>
          <div>{doneSlips.slice(0, 16).map((slip) => <button type="button" key={slip.id} onClick={() => updateSlip(slip.id, { status: "open", snoozeUntil: null })}><b>{slip.title}</b><span>{slip.status}{slip.approvedResult ? ` · ${slip.approvedResult}` : ""}</span></button>)}</div>
        </details>
      )}

      {selected && draft && (
        <div className="freshSlipOverlay freshPreparedOverlay" onClick={() => setSelectedId(null)}>
          <section className="freshSlipModal freshPreparedModal" onClick={(event) => event.stopPropagation()}>
            <header className="freshSlipHead">
              <span>{selected.areaGroup}</span>
              <h2>{draft.actionLabel}</h2>
              <p>{selected.info}</p>
            </header>
            <div className="freshSlipBody freshPreparedSlipBody">
              <div className="freshPreparedFormGrid">
                {draft.fields.map((item) => (
                  <label className={`freshPreparedFormField ${item.wide ? "freshPreparedFormFieldWide" : ""}`} key={item.key}>
                    <span>{item.label}</span>
                    {item.type === "textarea" ? (
                      <textarea value={item.value} onChange={(event) => updateDraftField(item.key, event.target.value)} />
                    ) : (
                      <input type={item.type || "text"} value={item.value} onChange={(event) => updateDraftField(item.key, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>

              <details className="freshPreparedContext">
                <summary>Why this is here</summary>
                <p><b>Found:</b> {draft.found}</p>
                <p><b>Why:</b> {draft.why}</p>
              </details>

              <div className="freshSlipActions">
                <button className="freshPrimary" onClick={() => approveSlip(selected, draft)}>{approveLabel(selected.actionType)}</button>
                <button className="freshDark" onClick={saveDraftEdit}>Save edit</button>
                <button className="freshGhost" onClick={() => snoozeSlip(selected)}>Snooze</button>
                <button className="freshGhost" onClick={() => ignoreSlip(selected)}>Ignore</button>
                <button className="freshOrange" onClick={() => onNavigate?.(selected.page || "setupassistant")}>Open area only if needed</button>
              </div>
              <button type="button" className="freshClose" onClick={() => setSelectedId(null)}>Close form</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
