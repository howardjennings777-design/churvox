// Targeted Ask Churvox answer fixer.
// Uses the real backend AI endpoint first, then falls back to safe local business rules.

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  return [];
};

const text = (value) => String(value || "").trim();
const low = (value) => text(value).toLowerCase();
const money = (value) => new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
}).format(Number(value || 0));
const amount = (item) => Number(item?.balance_due || item?.amount_due || item?.total || item?.amount || item?.price || item?.subtotal || 0) || 0;
const clientName = (item) => text(item?.customer_name || item?.client_name || item?.name || item?.business_name || item?.company_name || "Customer");
const idOf = (item) => text(item?.invoice_number || item?.number || item?.id || item?._id || "");
const isPast = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed < today;
};

async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { credentials: "include" });
    if (!res.ok) return [];
    return safeArray(await res.json());
  } catch {
    return [];
  }
}

async function askRealAi(question) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/ask`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const answer = text(payload?.answer || payload?.data?.answer || payload?.text);
    if (!answer) return null;
    const mode = payload?.used_ai || payload?.mode === "openai" || payload?.configured ? "Real AI" : "Smart fallback";
    return `${answer}\n\n— ${mode}`;
  } catch {
    return null;
  }
}

async function buildSnapshot() {
  const [jobs, quotes, invoices, workers] = await Promise.all([
    apiGet("/jobs"),
    apiGet("/quotes"),
    apiGet("/invoices"),
    apiGet("/team/workers"),
  ]);

  const openJobs = jobs.filter((job) => !["completed", "cancelled"].includes(low(job.status)));
  const unassignedJobs = openJobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to);
  const completedNoInvoice = jobs.filter((job) => low(job.status) === "completed" && !job.invoice_id && !job.invoice_number);
  const openQuotes = quotes.filter((quote) => ["sent", "pending", "draft"].includes(low(quote.status)));
  const unpaidInvoices = invoices.filter((invoice) => ["unpaid", "sent", "partial", "overdue"].includes(low(invoice.status)));
  const overdueInvoices = unpaidInvoices.filter((invoice) => low(invoice.status) === "overdue" || isPast(invoice.due_date || invoice.due_at));
  const unpaidValue = unpaidInvoices.reduce((sum, item) => sum + amount(item), 0);
  const overdueValue = overdueInvoices.reduce((sum, item) => sum + amount(item), 0);
  const quoteValue = openQuotes.reduce((sum, item) => sum + amount(item), 0);
  const topUnpaid = [...unpaidInvoices].sort((a, b) => amount(b) - amount(a)).slice(0, 3);

  return { jobs, quotes, invoices, workers, openJobs, unassignedJobs, completedNoInvoice, openQuotes, unpaidInvoices, overdueInvoices, unpaidValue, overdueValue, quoteValue, topUnpaid };
}

function findAskCard(input) {
  let node = input;
  for (let i = 0; i < 8 && node; i += 1) {
    const heading = Array.from(node.querySelectorAll?.("h1,h2,h3,p,div") || []).find((el) => low(el.textContent) === "ask churvox");
    if (heading) return node;
    node = node.parentElement;
  }
  return input.closest("section") || input.parentElement;
}

function findAnswerBox(card, input) {
  const boxes = Array.from(card.querySelectorAll("div,p"))
    .filter((el) => el !== input && !el.contains(input))
    .filter((el) => {
      const value = low(el.textContent);
      if (!value) return false;
      if (value === "ask churvox") return false;
      if (value.includes("ai suggests")) return false;
      if (value.includes("owners/admins")) return false;
      return true;
    });
  return boxes.reverse().find((el) => {
    const value = low(el.textContent);
    return value.includes("assign") || value.includes("invoice") || value.includes("quote") || value.includes("job") || value.includes("money") || value.includes("try asking") || value.includes("next") || value.includes("checking churvox");
  });
}

function answerFor(question, snapshot) {
  const q = low(question);

  if (q.includes("owe") || q.includes("owed") || q.includes("money") || q.includes("cash") || q.includes("unpaid") || q.includes("invoice")) {
    if (!snapshot.unpaidInvoices.length) return "No unpaid invoices found. No customer is currently showing as owing money in Churvox.";
    const names = snapshot.topUnpaid.map((item) => `${clientName(item)} ${idOf(item) ? `(${idOf(item)}) ` : ""}${money(amount(item))}`).join(" · ");
    return `${snapshot.unpaidInvoices.length} unpaid invoice${snapshot.unpaidInvoices.length === 1 ? "" : "s"} found worth ${money(snapshot.unpaidValue)}. ${snapshot.overdueInvoices.length} overdue worth ${money(snapshot.overdueValue)}. Top owing: ${names}.`;
  }

  if (q.includes("quote") || q.includes("follow")) {
    if (!snapshot.openQuotes.length) return "No open quotes need follow-up right now.";
    return `${snapshot.openQuotes.length} open quote${snapshot.openQuotes.length === 1 ? "" : "s"} may need follow-up, worth about ${money(snapshot.quoteValue)}.`;
  }

  if (q.includes("job") || q.includes("work") || q.includes("schedule")) {
    return `${snapshot.openJobs.length} jobs are open. ${snapshot.unassignedJobs.length} need assignment. ${snapshot.completedNoInvoice.length} completed job${snapshot.completedNoInvoice.length === 1 ? "" : "s"} may need draft invoices.`;
  }

  if (q.includes("worker") || q.includes("team") || q.includes("staff")) {
    return `${snapshot.workers.length} workers are loaded in Churvox. Use Team and Timesheets to check setup, rates and work allocation.`;
  }

  if (q.includes("next") || q.includes("do")) {
    if (snapshot.unpaidInvoices.length) return `Next best move: review unpaid invoices worth ${money(snapshot.unpaidValue)} and send reminders where needed.`;
    if (snapshot.unassignedJobs.length) return `Next best move: assign ${snapshot.unassignedJobs.length} open job${snapshot.unassignedJobs.length === 1 ? "" : "s"}.`;
    if (snapshot.openQuotes.length) return `Next best move: follow up ${snapshot.openQuotes.length} open quote${snapshot.openQuotes.length === 1 ? "" : "s"}.`;
    return "No urgent fire found. Keep automations and follow-ups clean.";
  }

  return `I can answer from Churvox data. Try: who owes money, what jobs need action, what quotes need follow-up, or what should I do next.`;
}

async function fixAskAnswer(input) {
  const question = text(input.value);
  if (!question) return;
  const card = findAskCard(input);
  const answerBox = card ? findAnswerBox(card, input) : null;
  if (!answerBox) return;
  answerBox.textContent = "Checking Churvox AI...";
  const realAiAnswer = await askRealAi(question);
  if (realAiAnswer) {
    answerBox.textContent = realAiAnswer;
    return;
  }
  answerBox.textContent = "Checking Churvox data...";
  const snapshot = await buildSnapshot();
  answerBox.textContent = `${answerFor(question, snapshot)}\n\n— Smart fallback`;
}

export function startAskChurvoxAnswerFixer() {
  const handler = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const card = findAskCard(target);
    if (!card || !low(card.textContent).includes("ask churvox")) return;
    if (event.type === "keydown" && event.key !== "Enter") return;
    setTimeout(() => fixAskAnswer(target), 80);
  };

  document.addEventListener("keydown", handler, true);
  document.addEventListener("change", handler, true);
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const card = findAskCard(button);
    if (!card || !low(card.textContent).includes("ask churvox")) return;
    const input = card.querySelector("input");
    if (input) setTimeout(() => fixAskAnswer(input), 120);
  }, true);
}
