const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const keyOf = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && clean(value)) || "";
const numberPick = (row, ...keys) => Number(keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== "") || 0);

export const SMART_ACTION_TYPES = [
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

function money(value) {
  try {
    return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
  } catch {
    return `$${Number(value || 0).toFixed(0)}`;
  }
}

function areaOf(value) {
  const text = clean(value).toLowerCase();
  const known = ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"];
  return known.find((area) => text.includes(area)) || clean(value).split(",")[0] || "same area";
}

function normalJob(row, index = 0) {
  return {
    id: clean(pick(row, "id", "_id", "job_id")),
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
    id: clean(pick(row, "id", "_id", "user_id", "worker_id")),
    name: clean(pick(row, "name", "full_name", "display_name", "email")) || `Worker ${index + 1}`,
    role: clean(pick(row, "role", "worker_role")) || "Worker",
    status: clean(pick(row, "status", "clock_status")) || "Available",
    job: clean(pick(row, "current_job", "job_title")),
    gps: clean(pick(row, "gps", "location", "area", "service_region")),
    skills: clean(pick(row, "skills", "skill_tags", "trade", "industry", "service_skills", "service", "notes")),
    serviceAreas: clean(pick(row, "service_areas", "service_area", "areas", "area", "region")),
    equipment: clean(pick(row, "equipment", "tools", "gear", "vehicle")),
    availability: clean(pick(row, "normal_availability", "availability", "work_days", "usual_hours")),
    capacity: clean(pick(row, "max_jobs_per_day", "max_jobs", "daily_capacity")),
    notes: clean(pick(row, "notes", "smart_profile_notes")),
  };
}

function normalClient(row, index = 0) {
  return {
    id: clean(pick(row, "id", "_id", "client_id")),
    name: clean(pick(row, "name", "client_name", "customer_name")) || `Client ${index + 1}`,
    address: clean(pick(row, "address", "site_address")),
    phone: clean(pick(row, "phone", "mobile")),
    email: clean(pick(row, "email")),
    notes: clean(pick(row, "notes", "access_notes")),
    schedule: clean(pick(row, "schedule", "preferred_schedule", "recurring")),
    service: clean(pick(row, "service", "preferred_service")),
    price: numberPick(row, "price", "saved_price"),
  };
}

function workerScore(worker, job) {
  const hay = `${worker.name} ${worker.role} ${worker.status} ${worker.job} ${worker.gps} ${worker.skills} ${worker.serviceAreas} ${worker.equipment} ${worker.availability} ${worker.notes}`.toLowerCase();
  const service = keyOf(job.service);
  const area = areaOf(job.address).toLowerCase();
  let score = 40;
  if (!/busy|in progress|on job|clocked/i.test(worker.status)) score += 20;
  if (service && hay.includes(service)) score += 20;
  if (area && hay.includes(area)) score += 16;
  if (!worker.job || /no job|available/i.test(worker.job)) score += 12;
  if (/worker|subcontractor|staff|field/i.test(worker.role)) score += 8;
  if (worker.equipment && keyOf(worker.equipment).includes(service)) score += 6;
  if (worker.capacity && Number(worker.capacity) > 0) score += 4;
  return score;
}

function bestWorker(workers, job) {
  const list = workers.length ? workers : [{ id: "", name: "the best available worker", status: "Available", role: "Worker", gps: areaOf(job.address), skills: job.service }];
  return [...list].sort((a, b) => workerScore(b, job) - workerScore(a, job))[0];
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function ownerActionRecord(action, status = "waiting_owner_review") {
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

export function smartActionsForPage(page, actions) {
  const map = {
    today: ["Smart Day Close", "Smart Assign", "Smart Schedule", "Smart Missing Info", "Smart Invoice Builder"],
    command: SMART_ACTION_TYPES,
    jobs: ["Smart Assign", "Smart Schedule", "Smart Run Builder", "Smart Missing Info"],
    workers: ["Smart Assign", "Smart Schedule", "Smart Run Builder"],
    clients: ["Smart Client Memory", "Smart Missing Info", "Smart Follow-up"],
    quotes: ["Smart Quote Builder", "Smart Follow-up", "Smart Missing Info"],
    invoices: ["Smart Invoice Builder", "Smart Follow-up", "Smart Missing Info"],
    messages: ["Smart Problem Slip", "Smart Follow-up", "Smart Client Memory"],
  };
  const allowed = map[page] || SMART_ACTION_TYPES;
  return actions.filter((action) => allowed.includes(action.type));
}

export function buildProductSmartActions(data = {}) {
  const jobs = (data.jobs || []).map(normalJob);
  const workers = (data.workers || data.team || []).map(normalWorker);
  const clients = (data.clients || []).map(normalClient);
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
  const client = clients[0] || { name: "the client", address: "site", notes: "", price: 0 };
  const jobForAssign = unassigned || jobs[0] || { id: "", title: "New job", client: client.name, address: client.address, service: client.service || "service", worker: "Unassigned", price: 0, status: "assigned" };
  const worker = bestWorker(workers, jobForAssign);
  const slotDate = unscheduled?.date || tomorrowDate();
  const slotTime = unscheduled?.time || "09:30";
  const totalDraft = invoices.filter((row) => !/paid/i.test(clean(row.status))).reduce((sum, row) => sum + numberPick(row, "amount", "total", "price"), 0);
  const quoteAmount = Math.max(Number(jobForAssign.price || 0), Number(client.price || 0), 145);
  const completedForInvoice = completed || jobForAssign;
  const message = messages[0] || { subject: "Worker update", detail: issueJob?.issue || "No problem message yet." };

  return [
    { type: "Smart Assign", title: `Best worker found for ${jobForAssign.title}`, summary: `${worker.name} is the best fit for ${jobForAssign.service} near ${areaOf(jobForAssign.address)}.`, recommendation: `Send ${jobForAssign.title} to Command for owner approval before assigning it to ${worker.name}.`, details: [`Area: ${areaOf(jobForAssign.address)}`, `Worker status: ${worker.status}`, `Skill/service: ${jobForAssign.service}`, `Owner approval stays in Command.`], payload: { job_id: jobForAssign.id, assigned_worker_name: worker.name, assigned_worker_id: worker.id, status: "assigned", smart_action: "Smart Assign" } },
    { type: "Smart Schedule", title: `Best time ready for ${unscheduled?.title || jobForAssign.title}`, summary: `${slotDate} at ${slotTime} keeps the job moving without crowding the run sheet.`, recommendation: "Send this schedule to Command for owner review.", details: [`Suggested date: ${slotDate}`, `Suggested time: ${slotTime}`, `Worker: ${worker.name}`, "No automatic booking without approval."], payload: { job_id: (unscheduled || jobForAssign).id, scheduled_date: slotDate, scheduled_time: slotTime, smart_action: "Smart Schedule" } },
    { type: "Smart Run Builder", title: `${areaOf(jobForAssign.address)} run ready to review`, summary: `Churvox can group ${Math.max(recurring.length, 1)} recurring or nearby job${Math.max(recurring.length, 1) === 1 ? "" : "s"} into a cleaner run.`, recommendation: "Review the run plan in Command before jobs are sent.", details: [`Run area: ${areaOf(jobForAssign.address)}`, `Recurring jobs found: ${recurring.length}`, `Lead worker: ${worker.name}`, "Owner approves before jobs are sent."] },
    { type: "Smart Quote Builder", title: `Quote prepared for ${jobForAssign.client || client.name}`, summary: `${money(quoteAmount)} prepared from job type, site notes and similar work.`, recommendation: "Review the price in Command before creating or sending anything.", details: [`Client: ${jobForAssign.client || client.name}`, `Service: ${jobForAssign.service}`, `Prepared amount: ${money(quoteAmount)}`, "Nothing is sent until owner approval."], payload: { title: `${jobForAssign.service} quote`, client_name: jobForAssign.client || client.name, amount: quoteAmount, status: "Draft", scope: `${jobForAssign.service} at ${jobForAssign.address || client.address}`, next_step: "Owner approval required", smart_action: "Smart Quote Builder" } },
    { type: "Smart Invoice Builder", title: `Invoice draft ready for ${completedForInvoice.client || client.name}`, summary: `${money(completedForInvoice.price || quoteAmount)} prepared from job price, notes and proof.`, recommendation: "Review the invoice draft before sending or syncing.", details: [`Job: ${completedForInvoice.title}`, `Client: ${completedForInvoice.client || client.name}`, `Amount: ${money(completedForInvoice.price || quoteAmount)}`, "Draft sync only; no automatic send."] },
    { type: "Smart Client Memory", title: `Client memory ready for ${client.name}`, summary: "Churvox can save access notes, preferred timing, pricing and reminders on the client file.", recommendation: "Save the memory after owner review so future jobs, quotes and invoices are faster.", details: [`Client: ${client.name}`, `Address: ${client.address || "missing"}`, `Current notes: ${client.notes || "none yet"}`, "Useful for repeat work and proof."] },
    { type: "Smart Missing Info", title: `${missingJob ? missingJob.title : "Records"} need missing info fixed`, summary: missingJob ? `Missing details found: ${[!missingJob.address && "address", !missingJob.price && "price", /unassigned/i.test(missingJob.worker) && "worker", (!missingJob.client || missingJob.client === "No client") && "client"].filter(Boolean).join(", ")}.` : "No major missing job info found right now.", recommendation: "Send missing info to Command before the job moves forward.", details: ["Address, price, worker and client checks", "Stops half-filled jobs reaching workers", "Owner can fix now or park", "Keeps forms clean."] },
    { type: "Smart Follow-up", title: "Follow-up prepared", summary: quoteDraft ? `Quote/client follow-up is ready for ${pick(quoteDraft, "client_name", "customer_name", "client") || client.name}.` : invoiceDraft ? `Invoice follow-up is ready for ${pick(invoiceDraft, "client_name", "customer_name", "client") || client.name}.` : "A polite customer follow-up can be prepared from the current record.", recommendation: "Approve the follow-up before anything is sent.", details: ["Polite wording", "Linked to client/job", "Owner-approved before sending", "Good for quotes and overdue invoices."] },
    { type: "Smart Problem Slip", title: "Problem slip ready", summary: issueJob ? `${issueJob.title}: ${issueJob.issue || issueJob.status}` : `${message.subject || "Worker update"} can become a clear owner decision.`, recommendation: "Turn the update into a Command slip with options.", details: ["Worker/customer issue", "Job and client context", "Suggested next move", "Approve, edit or park in Command."] },
    { type: "Smart Day Close", title: "Today's admin is ready to close", summary: `${jobs.length} jobs, ${invoices.length} invoices, ${messages.length} messages and ${money(totalDraft)} in draft invoice value checked.`, recommendation: "Review the admin pile, then park anything not ready.", details: [`Jobs checked: ${jobs.length}`, `Invoices checked: ${invoices.length}`, `Messages checked: ${messages.length}`, `Draft value: ${money(totalDraft)}`] },
  ];
}
