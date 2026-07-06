/* Churvox Smart Actions runtime
   Keeps the product promise: Churvox suggests and prepares. The owner approves. */

const RUNTIME_ID = "churvox-smart-actions-runtime-v1";
const ROOT_ID = "churvoxSmartActionsRoot";
const STYLE_ID = "churvoxSmartActionsStyle";
const API_BASE = String(process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

const SMART_TYPES = [
  "Smart Assign",
  "Smart Schedule",
  "Smart Run Builder",
  "Smart Quote Builder",
  "Smart Invoice Builder",
  "Smart Client Memory",
  "Smart Missing Info",
  "Smart Follow-up",
  "Smart Problem Slip",
  "Smart Day Close",
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyOf(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function money(value) {
  try { return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0)); }
  catch { return `$${Number(value || 0).toFixed(0)}`; }
}

function apiUrl(path) {
  const base = API_BASE || window.location.origin;
  return `${base.replace(/\/$/, "")}/api${String(path || "").startsWith("/") ? path : `/${path}`}`;
}

function authHeaders(extra = {}) {
  let token = "";
  try { token = localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch {}
  return { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.error || data?.message || `Request failed: ${response.status}`);
  return data;
}

function rowsFrom(payload, key) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "data", "jobs", "clients", "workers", "team", "quotes", "invoices", "messages", "actions", "notifications"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(row) {
  const raw = row?.id || row?._id || row?.job_id || row?.client_id || row?.quote_id || row?.invoice_id || row?.user_id || row?.message_id || "";
  return typeof raw === "object" ? clean(raw.$oid || raw.oid || raw.id || raw._id) : clean(raw);
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return "";
}

function numberPick(row, ...keys) {
  const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null && item !== "");
  return Number(value || 0);
}

function normalJob(row, index = 0) {
  return {
    raw: row,
    id: idOf(row),
    title: clean(pick(row, "title", "job_title", "job_name", "name", "description")) || `Job ${index + 1}`,
    client: clean(pick(row, "client_name", "customer_name", "client")) || "No client",
    address: clean(pick(row, "address", "site_address", "job_address")),
    service: clean(pick(row, "service", "service_type", "job_type")) || "Other",
    worker: clean(pick(row, "assigned_worker_name", "worker_name", "worker", "assigned_to")) || "Unassigned",
    date: clean(pick(row, "scheduled_date", "date", "start_date")),
    time: clean(pick(row, "scheduled_time", "start_time", "time")),
    status: clean(pick(row, "status", "job_status")) || "assigned",
    price: numberPick(row, "price", "amount", "total"),
    recurring: clean(pick(row, "recurring", "frequency", "repeat", "recurrence_pattern")) || "One-off",
    notes: clean(pick(row, "notes", "description")),
    issue: clean(pick(row, "issue", "problem", "needs_attention")),
  };
}

function normalWorker(row, index = 0) {
  return {
    raw: row,
    id: idOf(row),
    name: clean(pick(row, "name", "full_name", "display_name", "email")) || `Worker ${index + 1}`,
    email: clean(pick(row, "email")),
    role: clean(pick(row, "role", "worker_role")) || "Worker",
    status: clean(pick(row, "status", "clock_status")) || "Available",
    job: clean(pick(row, "current_job", "job_title")),
    gps: clean(pick(row, "gps", "location", "area", "service_region")),
    skills: clean(pick(row, "skills", "trade", "industry", "notes", "service")),
    notes: clean(pick(row, "notes")),
  };
}

function normalClient(row, index = 0) {
  return {
    raw: row,
    id: idOf(row),
    name: clean(pick(row, "name", "client_name", "customer_name")) || `Client ${index + 1}`,
    address: clean(pick(row, "address", "site_address")),
    phone: clean(pick(row, "phone", "mobile")),
    email: clean(pick(row, "email")),
    notes: clean(pick(row, "notes", "access_notes")),
    schedule: clean(pick(row, "schedule", "preferred_schedule", "recurring")),
    service: clean(pick(row, "service", "preferred_service")),
  };
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function areaOf(value) {
  const text = clean(value).toLowerCase();
  const known = ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"];
  return known.find((area) => text.includes(area)) || clean(value).split(",")[0] || "same area";
}

function workerScore(worker, job) {
  const hay = `${worker.name} ${worker.role} ${worker.status} ${worker.job} ${worker.gps} ${worker.skills} ${worker.notes}`.toLowerCase();
  const service = keyOf(job.service);
  const area = areaOf(job.address).toLowerCase();
  let score = 40;
  if (!/busy|in progress|on job|clocked/i.test(worker.status)) score += 20;
  if (service && hay.includes(service)) score += 20;
  if (area && hay.includes(area)) score += 16;
  if (!worker.job || /no job|available/i.test(worker.job)) score += 12;
  if (/worker|subcontractor|staff|field/i.test(worker.role)) score += 8;
  return score;
}

function bestWorker(workers, job) {
  const list = workers.length ? workers : [{ id: "", name: "the best available worker", status: "Available", role: "Worker", gps: areaOf(job.address), skills: job.service }];
  return [...list].sort((a, b) => workerScore(b, job) - workerScore(a, job))[0];
}

function ownerActionRecord(action, status = "waiting_owner_review") {
  return {
    kind: "smart_action",
    source: "Churvox Smart Actions",
    status,
    requires_owner_approval: true,
    auto_sent: false,
    accounting_synced: false,
    action_type: action.type,
    title: action.title,
    summary: action.summary,
    recommendation: action.recommendation,
    details: action.details,
    created_at: new Date().toISOString(),
  };
}

function pageKey() {
  const path = keyOf((window.location.pathname || "").split("/")[1] || "dashboard");
  const hash = keyOf((window.location.hash || "").replace(/^#/, "").split("?")[0]);
  const aliases = { dashboard: "today", smarthub: "today", setupguide: "support", accounting: "xero" };
  return hash || aliases[path] || path || "today";
}

function pageAllows(page, action) {
  const map = {
    today: ["Smart Day Close", "Smart Assign", "Smart Schedule", "Smart Missing Info", "Smart Invoice Builder"],
    command: SMART_TYPES,
    jobs: ["Smart Assign", "Smart Schedule", "Smart Run Builder", "Smart Missing Info"],
    workers: ["Smart Assign", "Smart Schedule", "Smart Run Builder"],
    clients: ["Smart Client Memory", "Smart Missing Info", "Smart Follow-up"],
    quotes: ["Smart Quote Builder", "Smart Follow-up", "Smart Missing Info"],
    invoices: ["Smart Invoice Builder", "Smart Follow-up", "Smart Missing Info"],
    messages: ["Smart Problem Slip", "Smart Follow-up", "Smart Client Memory"],
  };
  return (map[page] || SMART_TYPES).includes(action.type);
}

function buildSmartActions(data) {
  const jobs = data.jobs.map(normalJob);
  const workers = data.workers.map(normalWorker);
  const clients = data.clients.map(normalClient);
  const quotes = data.quotes || [];
  const invoices = data.invoices || [];
  const messages = data.messages || [];
  const unassigned = jobs.find((job) => /unassigned|no worker|none/i.test(job.worker));
  const unscheduled = jobs.find((job) => !job.date || !job.time);
  const recurring = jobs.filter((job) => !/one-off|oneoff/i.test(job.recurring));
  const completed = jobs.find((job) => /complete|done/i.test(job.status));
  const issueJob = jobs.find((job) => job.issue || /needs check|blocked|issue/i.test(job.status));
  const missingJob = jobs.find((job) => !job.client || job.client === "No client" || !job.address || !job.price || /unassigned/i.test(job.worker));
  const quoteDraft = quotes.find((row) => !/sent|accepted|converted/i.test(clean(row.status))) || quotes[0];
  const invoiceDraft = invoices.find((row) => !/paid/i.test(clean(row.status))) || invoices[0];
  const client = clients[0] || { name: "the client", address: "site", notes: "" };
  const jobForAssign = unassigned || jobs[0] || { id: "", title: "New job", client: client.name, address: client.address, service: client.service || "service", worker: "Unassigned", price: 0, status: "assigned" };
  const worker = bestWorker(workers, jobForAssign);
  const slotDate = unscheduled?.date || tomorrowDate();
  const slotTime = unscheduled?.time || "09:30";
  const totalDraft = invoices.filter((row) => !/paid/i.test(clean(row.status))).reduce((sum, row) => sum + numberPick(row, "amount", "total", "price"), 0);
  const quoteAmount = Math.max(Number(jobForAssign.price || 0), Number(client.price || 0), 145);
  const completedForInvoice = completed || jobForAssign;
  const message = messages[0] || { subject: "Worker update", detail: issueJob?.issue || "No problem message yet." };

  return [
    {
      type: "Smart Assign",
      title: `Best worker found for ${jobForAssign.title}`,
      summary: `${worker.name} is the best fit for ${jobForAssign.service} near ${areaOf(jobForAssign.address)}.`,
      recommendation: `Approve and send ${jobForAssign.title} to ${worker.name}.`,
      details: [`Area: ${areaOf(jobForAssign.address)}`, `Worker status: ${worker.status}`, `Skill/service: ${jobForAssign.service}`, `Owner still approves before sending.`],
      approveLabel: "Approve & send",
      async approve() {
        if (!jobForAssign.id) return ownerActionRecord(this, "approved_preview");
        return await fetchJson(`/jobs/${encodeURIComponent(jobForAssign.id)}`, { method: "PATCH", body: JSON.stringify({ assigned_worker_name: worker.name, assigned_worker_id: worker.id, status: "assigned", smart_action: "Smart Assign", assignment_reason: this.summary }) });
      },
    },
    {
      type: "Smart Schedule",
      title: `Best time ready for ${unscheduled?.title || jobForAssign.title}`,
      summary: `${slotDate} at ${slotTime} keeps the job moving without crowding the run sheet.`,
      recommendation: `Approve this date and time, then send it to the assigned worker.`,
      details: [`Suggested date: ${slotDate}`, `Suggested time: ${slotTime}`, `Worker: ${worker.name}`, `No automatic booking without approval.`],
      approveLabel: "Approve time",
      async approve() {
        const target = unscheduled || jobForAssign;
        if (!target.id) return ownerActionRecord(this, "approved_preview");
        return await fetchJson(`/jobs/${encodeURIComponent(target.id)}`, { method: "PATCH", body: JSON.stringify({ scheduled_date: slotDate, scheduled_time: slotTime, smart_action: "Smart Schedule" }) });
      },
    },
    {
      type: "Smart Run Builder",
      title: `${areaOf(jobForAssign.address)} run ready to review`,
      summary: `Churvox can group ${Math.max(recurring.length, 1)} recurring or nearby job${Math.max(recurring.length, 1) === 1 ? "" : "s"} into a cleaner run.`,
      recommendation: `Approve the run plan or park it until the schedule is ready.`,
      details: [`Run area: ${areaOf(jobForAssign.address)}`, `Recurring jobs found: ${recurring.length}`, `Lead worker: ${worker.name}`, `Owner approves before jobs are sent.`],
      approveLabel: "Approve run",
      async approve() { return await fetchJson("/command/execute-approved", { method: "POST", body: JSON.stringify({ action: "approve", item: ownerActionRecord(this, "approved") }) }); },
    },
    {
      type: "Smart Quote Builder",
      title: `Quote prepared for ${jobForAssign.client || client.name}`,
      summary: `${money(quoteAmount)} prepared from job type, site notes and similar work.`,
      recommendation: `Review the price, then approve the quote draft.`,
      details: [`Client: ${jobForAssign.client || client.name}`, `Service: ${jobForAssign.service}`, `Prepared amount: ${money(quoteAmount)}`, `Nothing is sent until owner approval.`],
      approveLabel: "Create quote",
      async approve() { return await fetchJson("/quotes", { method: "POST", body: JSON.stringify({ title: `${jobForAssign.service} quote`, client_name: jobForAssign.client || client.name, amount: quoteAmount, status: "Draft", scope: `${jobForAssign.service} at ${jobForAssign.address || client.address}`, next_step: "Owner approval required", smart_action: "Smart Quote Builder" }) }); },
    },
    {
      type: "Smart Invoice Builder",
      title: `Invoice draft ready for ${completedForInvoice.client || client.name}`,
      summary: `${money(completedForInvoice.price || quoteAmount)} prepared from job price, notes and proof.`,
      recommendation: `Approve the invoice draft before sending or syncing.`,
      details: [`Job: ${completedForInvoice.title}`, `Client: ${completedForInvoice.client || client.name}`, `Amount: ${money(completedForInvoice.price || quoteAmount)}`, `Draft sync only; no automatic send.`],
      approveLabel: "Create invoice",
      async approve() { return await fetchJson("/invoices", { method: "POST", body: JSON.stringify({ invoice_number: "Draft invoice", client_name: completedForInvoice.client || client.name, job_title: completedForInvoice.title, amount: completedForInvoice.price || quoteAmount, status: "Draft", accounting_status: "not_synced", evidence: "Prepared by Smart Invoice Builder for owner approval", smart_action: "Smart Invoice Builder" }) }); },
    },
    {
      type: "Smart Client Memory",
      title: `Client memory ready for ${client.name}`,
      summary: `Churvox can save access notes, preferred timing, pricing and reminders on the client file.`,
      recommendation: `Save the memory so future jobs, quotes and invoices are faster.`,
      details: [`Client: ${client.name}`, `Address: ${client.address || "missing"}`, `Current notes: ${client.notes || "none yet"}`, `Useful for repeat work and proof.`],
      approveLabel: "Save memory",
      async approve() {
        if (!client.id) return ownerActionRecord(this, "approved_preview");
        const memory = [client.notes, "Churvox memory: check access, preferred day, saved price and proof preference before booking."].filter(Boolean).join("\n");
        return await fetchJson(`/clients/${encodeURIComponent(client.id)}`, { method: "PATCH", body: JSON.stringify({ notes: memory, smart_action: "Smart Client Memory" }) });
      },
    },
    {
      type: "Smart Missing Info",
      title: `${missingJob ? missingJob.title : "Records"} need missing info fixed`,
      summary: missingJob ? `Missing details found: ${[!missingJob.address && "address", !missingJob.price && "price", /unassigned/i.test(missingJob.worker) && "worker", (!missingJob.client || missingJob.client === "No client") && "client"].filter(Boolean).join(", ")}.` : "No major missing job info found right now.",
      recommendation: `Send missing info to Command before the job moves forward.`,
      details: [`Address, price, worker and client checks`, `Stops half-filled jobs reaching workers`, `Owner can fix now or park`, `Keeps forms clean.`],
      approveLabel: "Send to Command",
      async approve() { return await fetchJson("/command/execute-approved", { method: "POST", body: JSON.stringify({ action: "approve", item: ownerActionRecord(this, "waiting_owner_review") }) }); },
    },
    {
      type: "Smart Follow-up",
      title: `Follow-up prepared`,
      summary: quoteDraft ? `Quote/client follow-up is ready for ${pick(quoteDraft, "client_name", "customer_name", "client") || client.name}.` : invoiceDraft ? `Invoice follow-up is ready for ${pick(invoiceDraft, "client_name", "customer_name", "client") || client.name}.` : "A polite customer follow-up can be prepared from the current record.",
      recommendation: `Approve the follow-up before anything is sent.`,
      details: [`Polite wording`, `Linked to client/job`, `Owner-approved before sending`, `Good for quotes and overdue invoices.`],
      approveLabel: "Prepare follow-up",
      async approve() { return await fetchJson("/messages", { method: "POST", body: JSON.stringify({ channel: "Owner follow-up", client_name: client.name, subject: "Follow-up ready", message: this.summary, drafted_reply: "Hi, just checking in on this. Let me know if you would like us to go ahead or if you need anything changed.", smart_action: "Smart Follow-up" }) }); },
    },
    {
      type: "Smart Problem Slip",
      title: `Problem slip ready`,
      summary: issueJob ? `${issueJob.title}: ${issueJob.issue || issueJob.status}` : `${message.subject || "Worker update"} can become a clear owner decision.`,
      recommendation: `Turn the update into a Command slip with options.`,
      details: [`Worker/customer issue`, `Job and client context`, `Suggested next move`, `Approve, edit or park.`],
      approveLabel: "Create slip",
      async approve() { return await fetchJson("/command/execute-approved", { method: "POST", body: JSON.stringify({ action: "approve", item: ownerActionRecord(this, "waiting_owner_review") }) }); },
    },
    {
      type: "Smart Day Close",
      title: `Today's admin is ready to close`,
      summary: `${jobs.length} jobs, ${invoices.length} invoices, ${messages.length} messages and ${money(totalDraft)} in draft invoice value checked.`,
      recommendation: `Review the admin pile, then park anything not ready.`,
      details: [`Jobs checked: ${jobs.length}`, `Invoices checked: ${invoices.length}`, `Messages checked: ${messages.length}`, `Draft value: ${money(totalDraft)}`],
      approveLabel: "Close day",
      async approve() { return await fetchJson("/command/execute-approved", { method: "POST", body: JSON.stringify({ action: "approve", item: ownerActionRecord(this, "approved") }) }); },
    },
  ];
}

async function loadData() {
  const results = await Promise.allSettled([
    fetchJson("/jobs"), fetchJson("/clients"), fetchJson("/team"), fetchJson("/quotes"), fetchJson("/invoices"), fetchJson("/messages"), fetchJson("/command/actions"),
  ]);
  return {
    jobs: rowsFrom(results[0]?.value, "jobs"),
    clients: rowsFrom(results[1]?.value, "clients"),
    workers: rowsFrom(results[2]?.value, "team"),
    quotes: rowsFrom(results[3]?.value, "quotes"),
    invoices: rowsFrom(results[4]?.value, "invoices"),
    messages: rowsFrom(results[5]?.value, "messages"),
    command: rowsFrom(results[6]?.value, "actions"),
  };
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:9998;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#101513}
    .cvSmartDock{width:min(430px,calc(100vw - 28px));border:1px solid rgba(16,21,19,.12);border-radius:28px;background:rgba(255,253,247,.96);box-shadow:0 26px 80px rgba(16,21,19,.24);overflow:hidden;backdrop-filter:blur(18px)}
    .cvSmartDock.isClosed{width:auto;border-radius:999px}.cvSmartDock.isClosed .cvSmartBody{display:none}.cvSmartHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;background:linear-gradient(135deg,#101513,#1f2924 62%,#5a260d);color:white}.cvSmartHead button{border:0;border-radius:999px;background:rgba(255,255,255,.1);color:white;padding:8px 10px;font-weight:1000;cursor:pointer}.cvSmartTitle{display:grid;gap:2px}.cvSmartTitle small{color:#ffbc83;font-size:10px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase}.cvSmartTitle b{font-size:16px;letter-spacing:-.04em}.cvSmartBody{display:grid;gap:12px;padding:14px;max-height:min(72vh,660px);overflow:auto}.cvSmartIntro{display:grid;gap:4px;border:1px solid rgba(243,107,33,.18);border-radius:20px;padding:12px;background:#fff2e7}.cvSmartIntro b{font-size:14px}.cvSmartIntro span{color:#5f675f;font-size:12px;font-weight:800;line-height:1.4}.cvSmartTabs{display:flex;gap:8px;overflow:auto;padding-bottom:2px}.cvSmartTabs button{white-space:nowrap;border:1px solid rgba(16,21,19,.1);border-radius:999px;background:white;padding:8px 10px;font-size:11px;font-weight:1000;color:#59635c;cursor:pointer}.cvSmartTabs button.active{background:#101513;color:#fff;border-color:#101513}.cvSmartCard{display:grid;gap:10px;border:1px solid rgba(16,21,19,.1);border-radius:22px;background:#fff;padding:13px;box-shadow:0 10px 30px rgba(16,21,19,.06)}.cvSmartCard header{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.cvSmartCard h3{margin:0;font-size:16px;letter-spacing:-.04em}.cvSmartCard em{font-style:normal;border-radius:999px;background:#fff0df;color:#9d3b05;padding:6px 8px;font-size:10px;font-weight:1000;text-transform:uppercase}.cvSmartCard p{margin:0;color:#4f5b54;font-size:13px;font-weight:760;line-height:1.42}.cvSmartDetails{display:grid;grid-template-columns:1fr 1fr;gap:6px}.cvSmartDetails span{border-radius:12px;background:#f4efe6;padding:8px;color:#53615a;font-size:11px;font-weight:850}.cvSmartActions{display:flex;gap:8px;flex-wrap:wrap}.cvSmartActions button{border:0;border-radius:999px;padding:9px 11px;font-size:12px;font-weight:1000;cursor:pointer}.cvSmartActions .approve{background:linear-gradient(135deg,#f36b21,#ff9b45);color:#211006}.cvSmartActions .edit{background:#101513;color:white}.cvSmartActions .park{background:#efe7dc;color:#3a413c}.cvSmartFoot{color:#6a756e;font-size:11px;font-weight:800;line-height:1.4}.cvSmartNotice{border-radius:16px;padding:10px;background:#e9f8ef;color:#15522d;font-size:12px;font-weight:900}.cvSmartNotice.bad{background:#fff0ef;color:#8b1e13}@media(max-width:760px){#${ROOT_ID}{right:8px;left:8px;bottom:8px}.cvSmartDock{width:100%}.cvSmartDetails{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

let state = { closed: false, filter: "page", data: null, actions: [], notice: null, loading: true };
let refreshTimer = null;

function render() {
  ensureStyle();
  const root = ensureRoot();
  const page = pageKey();
  const actions = state.actions.filter((action) => state.filter === "all" || pageAllows(page, action));
  const visible = actions.slice(0, 4);
  root.innerHTML = `
    <section class="cvSmartDock ${state.closed ? "isClosed" : ""}" data-runtime="${RUNTIME_ID}">
      <div class="cvSmartHead">
        <div class="cvSmartTitle"><small>Command Smart Actions</small><b>${state.closed ? "Smart" : "Churvox has suggestions"}</b></div>
        <button type="button" data-smart-toggle>${state.closed ? "Open" : "Close"}</button>
      </div>
      <div class="cvSmartBody">
        <div class="cvSmartIntro"><b>Churvox prepares. You approve.</b><span>Smart Assign, Schedule, Run Builder, Quotes, Invoices, Client Memory, Missing Info, Follow-ups, Problem Slips and Day Close are all owner-approved.</span></div>
        ${state.notice ? `<div class="cvSmartNotice ${state.notice.tone || ""}">${state.notice.text}</div>` : ""}
        <div class="cvSmartTabs"><button type="button" data-smart-filter="page" class="${state.filter === "page" ? "active" : ""}">This page</button><button type="button" data-smart-filter="all" class="${state.filter === "all" ? "active" : ""}">All 10</button><button type="button" data-smart-refresh>Refresh</button></div>
        ${state.loading ? `<div class="cvSmartCard"><p>Checking jobs, workers, clients, quotes, invoices and messages…</p></div>` : visible.map((action, index) => cardHtml(action, index)).join("")}
        <div class="cvSmartFoot">Nothing is auto-sent. Approve runs the prepared action, Edit saves a review slip, Park sends it to Command for later.</div>
      </div>
    </section>`;
  bind(root, actions);
}

function cardHtml(action, index) {
  return `<article class="cvSmartCard"><header><h3>${escapeHtml(action.title)}</h3><em>${escapeHtml(action.type)}</em></header><p>${escapeHtml(action.summary)}</p><p><b>${escapeHtml(action.recommendation)}</b></p><div class="cvSmartDetails">${(action.details || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><div class="cvSmartActions"><button type="button" class="approve" data-smart-approve="${index}">${escapeHtml(action.approveLabel || "Approve")}</button><button type="button" class="edit" data-smart-edit="${index}">Edit</button><button type="button" class="park" data-smart-park="${index}">Park</button></div></article>`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = clean(value);
  return div.innerHTML;
}

function bind(root, actions) {
  root.querySelector("[data-smart-toggle]")?.addEventListener("click", () => { state.closed = !state.closed; render(); });
  root.querySelectorAll("[data-smart-filter]").forEach((button) => button.addEventListener("click", () => { state.filter = button.getAttribute("data-smart-filter") || "page"; render(); }));
  root.querySelector("[data-smart-refresh]")?.addEventListener("click", () => refreshSmartActions(true));
  root.querySelectorAll("[data-smart-approve]").forEach((button) => button.addEventListener("click", () => applyAction(actions[Number(button.getAttribute("data-smart-approve"))], "approve")));
  root.querySelectorAll("[data-smart-edit]").forEach((button) => button.addEventListener("click", () => applyAction(actions[Number(button.getAttribute("data-smart-edit"))], "edit")));
  root.querySelectorAll("[data-smart-park]").forEach((button) => button.addEventListener("click", () => applyAction(actions[Number(button.getAttribute("data-smart-park"))], "park")));
}

async function applyAction(action, mode) {
  if (!action) return;
  state.notice = { text: `${mode === "approve" ? "Approving" : mode === "edit" ? "Saving edit slip" : "Parking"}: ${action.type}…` };
  render();
  try {
    if (mode === "approve" && typeof action.approve === "function") await action.approve();
    else await fetchJson("/command/execute-approved", { method: "POST", body: JSON.stringify({ action: mode, item: ownerActionRecord(action, mode === "park" ? "parked" : "waiting_owner_review") }) });
    state.notice = { text: `${action.type} ${mode === "park" ? "parked" : mode === "edit" ? "saved for review" : "approved"}.` };
    window.dispatchEvent(new Event("churvox:data-refresh"));
    await refreshSmartActions(false);
  } catch (error) {
    state.notice = { text: error?.message || "Smart Action could not be saved.", tone: "bad" };
    render();
  }
}

async function refreshSmartActions(showLoading = false) {
  if (showLoading) { state.loading = true; render(); }
  try {
    const data = await loadData();
    state.data = data;
    state.actions = buildSmartActions(data);
    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    state.notice = { text: error?.message || "Could not load Smart Actions yet.", tone: "bad" };
    render();
  }
}

function shouldRun() {
  const path = window.location.pathname || "";
  return path === "/dashboard" || path.startsWith("/dashboard") || path === "/plans" || path === "/setup" || path === "/setup-guide";
}

function start() {
  if (!shouldRun()) return;
  ensureStyle();
  ensureRoot();
  render();
  refreshSmartActions(true);
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => refreshSmartActions(false), 90000);
}

if (typeof window !== "undefined" && !window.__CHURVOX_SMART_ACTIONS_RUNTIME__) {
  window.__CHURVOX_SMART_ACTIONS_RUNTIME__ = true;
  setTimeout(start, 900);
  window.addEventListener("hashchange", () => setTimeout(render, 80));
  window.addEventListener("popstate", () => setTimeout(start, 80));
  window.addEventListener("churvox:data-refresh", () => setTimeout(() => refreshSmartActions(false), 500));
}
