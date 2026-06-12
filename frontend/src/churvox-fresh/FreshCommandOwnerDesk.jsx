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
    prepared: "Invoice review is ready. Check the price and wording, then approve it from here.",
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
    prepared: "A payment reminder is drafted and ready for owner approval.",
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
    prepared: "A polite quote follow-up is drafted and ready to approve.",
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
    prepared: "A worker assignment check is ready. Review the suggested dispatch note before approving.",
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
    prepared: "A missing-info fix is ready so the job can move without opening another page.",
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
    prepared: "A worker time review is ready before payroll export.",
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
    prepared: "A missing-client-detail fix is ready before messages, quotes or invoices go out.",
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
    prepared: "A setup checklist is ready. Review it and mark handled from here.",
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
    review_invoice: "Approve invoice draft",
    send_payment_reminder: "Approve reminder",
    send_quote_followup: "Approve follow-up",
    approve_quote: "Approve quote action",
    assign_worker: "Approve assignment",
    review_worker_time: "Approve time review",
    fix_setup_step: "Approve setup fix",
    fix_missing_info: "Approve info fix",
    send_customer_message: "Approve message",
    owner_review: "Approve prepared work",
  };
  return labels[actionType] || "Approve prepared work";
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
    prepared: cleanText(slip?.prepared) || "The next safe action is ready.",
    why: cleanText(slip?.why || slip?.owner) || "This keeps admin moving while the owner stays in control.",
    owner: cleanText(slip?.owner) || "Review, edit, approve, snooze or ignore from this slip.",
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

function buildPreparedDraft(slip) {
  if (!slip) return null;
  if (slip.draft) return { ...slip.draft };

  const common = {
    title: slip.title,
    found: slip.found,
    prepared: slip.prepared,
    why: slip.why,
    ownerNote: slip.owner,
  };

  const drafts = {
    review_invoice: {
      actionLabel: "Invoice draft",
      preparedBody: "Invoice draft prepared from the completed job.\n\nService: completed job work\nCustomer note: Work completed as agreed\nAmount: review price before sending\nStatus: ready for owner approval",
      approveResult: "Invoice draft approved by owner.",
    },
    send_payment_reminder: {
      actionLabel: "Payment reminder",
      preparedBody: "Hi, just a friendly reminder that this invoice is still showing as unpaid. Please let us know if you need anything resent. Thanks.",
      approveResult: "Payment reminder approved by owner.",
    },
    send_quote_followup: {
      actionLabel: "Quote follow-up",
      preparedBody: "Hi, just checking in on the quote we sent through. Happy to answer any questions or book the work in when you are ready.",
      approveResult: "Quote follow-up approved by owner.",
    },
    assign_worker: {
      actionLabel: "Worker assignment",
      preparedBody: "Suggested dispatch action:\n\nAssign the job to the best available worker. Check area, workload, job notes and timing before confirming.",
      approveResult: "Worker assignment action approved by owner.",
    },
    review_worker_time: {
      actionLabel: "Time review",
      preparedBody: "Worker time review prepared. Check completed work, hours, notes and any manual adjustments before payroll export.",
      approveResult: "Worker time review approved by owner.",
    },
    fix_setup_step: {
      actionLabel: "Setup fix",
      preparedBody: "Setup fix prepared. Complete the missing business, invoice, client or first-job details so the workflow is ready.",
      approveResult: "Setup fix marked handled by owner.",
    },
    fix_missing_info: {
      actionLabel: "Missing info fix",
      preparedBody: "Missing information to check:\n\n- Price or quote amount\n- Customer contact details\n- Address or access notes\n- Job notes/photos\n- Worker assignment or completion notes",
      approveResult: "Missing information fix approved by owner.",
    },
    send_customer_message: {
      actionLabel: "Customer message",
      preparedBody: "Customer message prepared. Review the wording, then approve before it goes out.",
      approveResult: "Customer message approved by owner.",
    },
    owner_review: {
      actionLabel: "Owner decision",
      preparedBody: "Owner action prepared. Review the details and approve or edit before anything moves forward.",
      approveResult: "Prepared action approved by owner.",
    },
  };

  const actionDraft = drafts[slip.actionType] || drafts.owner_review;
  return { ...common, ...actionDraft };
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

    const existing = slips.map(normalizeSlip);
    const rules = sourceRules.map(makeRuleSlip);
    const next = [...rules, ...existing].slice(0, 180);
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

  function updateDraft(field, value) {
    setDraft((current) => ({ ...(current || buildPreparedDraft(selected)), [field]: value }));
  }

  function saveDraftEdit() {
    if (!selected || !draft) return;
    updateSlip(selected.id, {
      title: draft.title,
      found: draft.found,
      prepared: draft.prepared,
      why: draft.why,
      owner: draft.ownerNote,
      draft,
      status: "edited",
      editedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setMessage("Edit saved in Command.");
  }

  async function approveSlip(slip, preparedDraft = null) {
    const finalDraft = preparedDraft || buildPreparedDraft(slip);
    const result = finalDraft?.approveResult || "Prepared action approved by owner.";

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
          <p>Open a tray, check the filled slip, edit in place, then approve. You only open another area when you really need to.</p>
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
                  <em>{slip.urgency} · open slip</em>
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
              <label className="freshPreparedEditor">
                Action title
                <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
              </label>

              <label className="freshPreparedEditor">
                Found
                <textarea value={draft.found} onChange={(event) => updateDraft("found", event.target.value)} />
              </label>

              <label className="freshPreparedEditor">
                Prepared for approval
                <textarea value={draft.prepared} onChange={(event) => updateDraft("prepared", event.target.value)} />
              </label>

              <label className="freshPreparedEditor freshPreparedEditorTall">
                Filled draft / action details
                <textarea value={draft.preparedBody} onChange={(event) => updateDraft("preparedBody", event.target.value)} />
              </label>

              <label className="freshPreparedEditor">
                Why it matters
                <textarea value={draft.why} onChange={(event) => updateDraft("why", event.target.value)} />
              </label>

              <label className="freshPreparedEditor">
                Owner note
                <textarea value={draft.ownerNote} onChange={(event) => updateDraft("ownerNote", event.target.value)} />
              </label>

              <div className="freshSlipActions">
                <button className="freshPrimary" onClick={() => approveSlip(selected, draft)}>{approveLabel(selected.actionType)}</button>
                <button className="freshDark" onClick={saveDraftEdit}>Save edit</button>
                <button className="freshGhost" onClick={() => snoozeSlip(selected)}>Snooze</button>
                <button className="freshGhost" onClick={() => ignoreSlip(selected)}>Ignore</button>
                <button className="freshOrange" onClick={() => onNavigate?.(selected.page || "setupassistant")}>Open area only if needed</button>
              </div>

              <button type="button" className="freshClose" onClick={() => setSelectedId(null)}>Close slip</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
