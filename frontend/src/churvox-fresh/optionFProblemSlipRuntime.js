// CHURVOX_OPTION_F_PROBLEM_SLIP_RUNTIME_20260629
// Highlights the actual blocking fields when a Churvox slip opens.

const DRAWER_SELECTOR = ".churvoxOptionC .cocDrawer";
const RECORD_POPUP_SELECTOR = ".cv-record-popup";
const SUMMARY_CLASS = "cocProblemSummary";
const FIELD_CLASS = "cocProblemField";
const RECORD_SUMMARY_CLASS = "cv-popup-problem-summary";
const RECORD_FIELD_CLASS = "cv-popup-problem-field";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function norm(value) {
  return clean(value).toLowerCase();
}

function moneyValue(value) {
  const raw = clean(value).replace(/[^0-9.-]/g, "");
  if (!raw) return 0;
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function isBlank(value) {
  const text = norm(value);
  return !text || text === "not set" || text === "not saved" || text === "none" || text === "undefined" || text === "null";
}

function findField(fields, names) {
  const wanted = names.map(norm);
  return fields.find((field) => wanted.some((name) => field.key === name || field.key.includes(name)));
}

function findFilledField(fields, names, money = false) {
  const wanted = names.map(norm);
  return fields.find((field) => wanted.some((name) => field.key === name || field.key.includes(name)) && (!isBlank(field.value)) && (!money || moneyValue(field.value) > 0));
}

function addProblem(problems, field, title, detail, severity = "blocker") {
  if (!field && !title) return;
  problems.push({ field, title, detail, severity });
}

function textFor(fields, names) {
  return norm(findField(fields, names)?.value || "");
}

function signatureFor(problems) {
  if (!problems.length) return "ok";
  return problems.map((problem) => [problem.title, problem.detail, problem.severity, problem.field?.key].map(clean).join(":")) .join("|");
}

function drawerFields(drawer) {
  return Array.from(drawer.querySelectorAll(".cocField")).map((el) => {
    const label = clean(el.querySelector("span")?.textContent || "");
    const control = el.querySelector("input, textarea, select");
    const value = control ? clean(control.value) : clean(el.textContent || "").replace(label, "").trim();
    return { el, label, key: norm(label), value, text: norm(value) };
  });
}

function analyseDrawer(drawer) {
  const title = norm(drawer.querySelector("h2")?.textContent || "");
  const type = norm(drawer.querySelector("em")?.textContent || "");
  const fields = drawerFields(drawer);
  const problems = [];

  const client = findField(fields, ["client"]);
  const date = findField(fields, ["scheduled date", "due date", "date"]);
  const time = findField(fields, ["start time", "clock in", "time"]);
  const worker = findField(fields, ["assigned worker", "worker"]);
  const price = findField(fields, ["price nzd", "amount", "total"]);
  const proof = findField(fields, ["proof/photos", "proof", "evidence"]);
  const issue = findField(fields, ["issue status", "owner check", "prepared status", "slip/payroll status", "next step", "priority"]);
  const status = findField(fields, ["status", "clock status"]);

  const isJob = title.includes("job") || type.includes("job");
  const isApproval = title.includes("approval") || type.includes("command");
  const isWorker = title.includes("worker") || title.includes("timesheet") || type.includes("worker") || type.includes("timesheet");
  const isInvoice = title.includes("invoice") || type.includes("invoice");
  const isQuote = title.includes("quote") || type.includes("quote");
  const isMessage = title.includes("message") || type.includes("message");
  const isClient = title.includes("client") || type.includes("client");
  const isPerson = title.includes("person") || type.includes("person") || type.includes("team");

  if (isJob) {
    if (!client || isBlank(client.value)) addProblem(problems, client, "Client missing", "Choose the client before the job can move cleanly.");
    if (!date || isBlank(date.value)) addProblem(problems, date, "No date", "Do not add this to Today until a scheduled date is set.");
    if (!time || isBlank(time.value)) addProblem(problems, time, "No start time", "Today needs a usable time so the boss knows when it happens.");
    if (!worker || isBlank(worker.value)) addProblem(problems, worker, "No worker assigned", "Assign a worker or keep it out of the live day view.");
    const billing = textFor(fields, ["billing type"]);
    if (price && moneyValue(price.value) <= 0 && !billing.includes("quote")) addProblem(problems, price, "No price", "Set a price or change the billing type to quote required.");
    if (proof && /no proof|missing|not ready/i.test(proof.value)) addProblem(problems, proof, "Proof missing", "Proof is not ready. Keep this visible before invoicing.", "warning");
    if (issue && /waiting in command|issue|extra|approval|problem|needs|mismatch/i.test(issue.value)) addProblem(problems, issue, "Command issue", issue.value || "This job has an owner attention item.");
    if (status && /needs_check|quote_draft|mismatch|review|pending/i.test(status.value)) addProblem(problems, status, "Status needs owner check", `Current status is ${status.value}.`, "warning");
  }

  if (isApproval) {
    const action = findField(fields, ["recommended action"]);
    const filled = findField(fields, ["what churvox filled"]);
    const evidence = findField(fields, ["evidence checked"]);
    const ownerCheck = findField(fields, ["owner check"]);
    if (action && /edit|park/i.test(action.value)) addProblem(problems, action, "Decision is not simple approve", `Recommended action is ${action.value}.`, "warning");
    if (!filled || isBlank(filled.value)) addProblem(problems, filled, "Prepared work missing", "The slip needs the filled admin before approval.");
    if (!evidence || isBlank(evidence.value)) addProblem(problems, evidence, "Evidence missing", "Show the job proof, message or record source that created this item.");
    if (ownerCheck && /missing|mismatch|confirm|edit|park|needs|issue/i.test(ownerCheck.value)) addProblem(problems, ownerCheck, "Owner check needed", ownerCheck.value);
  }

  if (isInvoice) {
    if (price && moneyValue(price.value) <= 0) addProblem(problems, price, "Invoice amount missing", "Set the invoice amount before it can be approved.");
    if (!date || isBlank(date.value)) addProblem(problems, date, "Due date missing", "Invoices need a due date before chasing or sync.");
    const sync = findField(fields, ["xero/myob status", "sync", "approval"]);
    if (sync && /command|not synced|approval|waiting/i.test(sync.value)) addProblem(problems, sync, "Sync decision waits in Command", sync.value, "warning");
    if (proof && /no proof|missing|not saved/i.test(proof.value)) addProblem(problems, proof, "Invoice proof missing", "Attach or confirm evidence before sending.", "warning");
  }

  if (isQuote) {
    if (price && moneyValue(price.value) <= 0) addProblem(problems, price, "Quote amount missing", "Set the amount before sending.");
    const scope = findField(fields, ["scope"]);
    if (!scope || isBlank(scope.value)) addProblem(problems, scope, "Scope missing", "The customer needs to know exactly what is included.");
    const next = findField(fields, ["next step", "follow-up"]);
    if (next && /waiting in command|follow-up|ready|edit/i.test(next.value)) addProblem(problems, next, "Follow-up needs Command", next.value, "warning");
  }

  if (isMessage) {
    const draft = findField(fields, ["drafted reply"]);
    if (!draft || isBlank(draft.value)) addProblem(problems, draft, "Reply not drafted", "Churvox should prepare the reply before owner approval.");
    if (issue && /needs reply|command issue|priority|waiting/i.test(issue.value)) addProblem(problems, issue, "Message needs owner attention", issue.value, "warning");
  }

  if (isWorker) {
    const clockOut = findField(fields, ["clock out"]);
    const slip = findField(fields, ["slip/payroll status", "payroll review", "timesheet"]);
    if (clockOut && /still working|not set|missing/i.test(clockOut.value)) addProblem(problems, clockOut, "Clock-out not final", "Timesheet is not ready until the day is closed.", "warning");
    if (slip && /needs|review|pending|not ready|mismatch|0h/i.test(slip.value)) addProblem(problems, slip, "Slip needs review", slip.value || "Worker slip is not ready.");
    if (proof && /no proof|missing/i.test(proof.value)) addProblem(problems, proof, "Worker proof missing", "Ask for proof before approving the slip.", "warning");
  }

  if (isClient) {
    const phone = findField(fields, ["phone"]);
    const email = findField(fields, ["email"]);
    const address = findField(fields, ["address"]);
    if ((!phone || isBlank(phone.value)) && (!email || isBlank(email.value))) addProblem(problems, phone || email, "No contact method", "Save phone or email before relying on follow-up.");
    if (!address || isBlank(address.value)) addProblem(problems, address, "Address missing", "Jobs need a usable site address.");
  }

  if (isPerson) {
    const access = findField(fields, ["access", "role"]);
    const app = findField(fields, ["worker app"]);
    if (access && /no access|invited|pending/i.test(access.value)) addProblem(problems, access, "Access not ready", access.value, "warning");
    if (app && /invited|pending|inactive/i.test(app.value)) addProblem(problems, app, "Worker app not ready", app.value, "warning");
  }

  if (!problems.length && issue && /missing|problem|issue|needs|review|pending|command|mismatch|extra|approval/i.test(issue.value)) {
    addProblem(problems, issue, "Needs owner attention", issue.value, "warning");
  }

  return { problems };
}

function clearDrawer(drawer) {
  drawer.querySelector(`.${SUMMARY_CLASS}`)?.remove();
  drawer.querySelectorAll(`.${FIELD_CLASS}`).forEach((el) => {
    el.classList.remove(FIELD_CLASS, "cocWarningField");
    el.removeAttribute("data-problem");
  });
}

function renderDrawerSummary(drawer, problems) {
  const anchor = drawer.querySelector("p") || drawer.querySelector("h2");
  if (!anchor) return;
  const summary = document.createElement("section");
  summary.className = SUMMARY_CLASS;
  summary.innerHTML = `<strong>${problems.length ? "Fix first" : "No blockers found"}</strong><span>${problems.length ? "Churvox found the fields slowing this slip down." : "This slip looks complete enough for the owner to read."}</span><ul>${problems.map((problem) => `<li class="${problem.severity === "warning" ? "warn" : ""}"><b>${problem.title}</b><small>${problem.detail || "Needs attention"}</small></li>`).join("")}</ul>`;
  anchor.insertAdjacentElement("afterend", summary);
}

function enhanceDrawer(drawer) {
  const { problems } = analyseDrawer(drawer);
  const sig = signatureFor(problems);
  if (drawer.dataset.problemSlipSig === sig && drawer.querySelector(`.${SUMMARY_CLASS}`)) return;
  drawer.dataset.problemSlipSig = sig;
  clearDrawer(drawer);
  problems.forEach((problem) => {
    if (!problem.field?.el) return;
    problem.field.el.classList.add(FIELD_CLASS);
    if (problem.severity === "warning") problem.field.el.classList.add("cocWarningField");
    problem.field.el.dataset.problem = problem.title;
  });
  renderDrawerSummary(drawer, problems);
}

function recordRows(root) {
  return Array.from(root.querySelectorAll(".cv-popup-info-row, .cv-popup-field, .cv-popup-summary div")).map((el) => {
    const label = clean(el.querySelector("span")?.textContent || "");
    const control = el.querySelector("input, textarea, select");
    const strong = el.querySelector("strong");
    const value = control ? clean(control.value) : clean(strong?.textContent || "");
    return { el, label, key: norm(label), value, text: norm(value) };
  });
}

function analyseRecordPopup(root) {
  const kind = norm(root.querySelector(".cv-record-popup-header p")?.textContent || "");
  const rows = recordRows(root);
  const problems = [];
  const requiredByKind = {
    job: [{ names: ["status"] }, { names: ["client", "client name", "customer name"] }, { names: ["address", "site address"] }, { names: ["scheduled date", "scheduled at"] }, { names: ["price", "fixed price"], money: true }],
    invoice: [{ names: ["status"] }, { names: ["customer name", "client name"] }, { names: ["due date"] }, { names: ["total", "amount due", "subtotal"], money: true }],
    quote: [{ names: ["status"] }, { names: ["customer name", "client name"] }, { names: ["description", "scope"] }, { names: ["total", "price", "subtotal"], money: true }],
    client: [{ names: ["name", "client name", "customer name"] }, { names: ["email", "phone"] }, { names: ["address", "site address", "billing address"] }],
    person: [{ names: ["name", "full name", "display name", "email"] }, { names: ["role"] }, { names: ["status"] }],
  };
  (requiredByKind[kind] || []).forEach((rule) => {
    const row = findFilledField(rows, rule.names, rule.money);
    if (!row) addProblem(problems, findField(rows, rule.names), `${rule.names[0].replaceAll("_", " ")} missing`, "This record needs this before Churvox can prepare clean admin.");
  });
  rows.forEach((row) => {
    if (/status|sync|notes|description|internal notes|worker notes/i.test(row.label) && /missing|needs|review|pending|not synced|command|mismatch|issue|overdue/i.test(row.value)) {
      addProblem(problems, row, "Needs owner attention", `${row.label}: ${row.value}`, "warning");
    }
  });
  return { problems };
}

function clearRecordPopup(root) {
  root.querySelector(`.${RECORD_SUMMARY_CLASS}`)?.remove();
  root.querySelectorAll(`.${RECORD_FIELD_CLASS}`).forEach((el) => {
    el.classList.remove(RECORD_FIELD_CLASS, "cv-popup-warning-field");
    el.removeAttribute("data-problem");
  });
}

function enhanceRecordPopup(root) {
  const body = root.querySelector(".cv-record-popup-body");
  const detail = root.querySelector(".cv-popup-detail-grid");
  if (!body || !detail) return;
  const { problems } = analyseRecordPopup(root);
  const sig = signatureFor(problems);
  if (root.dataset.problemSlipSig === sig && root.querySelector(`.${RECORD_SUMMARY_CLASS}`)) return;
  root.dataset.problemSlipSig = sig;
  clearRecordPopup(root);
  problems.forEach((problem) => {
    if (!problem.field?.el) return;
    problem.field.el.classList.add(RECORD_FIELD_CLASS);
    if (problem.severity === "warning") problem.field.el.classList.add("cv-popup-warning-field");
    problem.field.el.dataset.problem = problem.title;
  });
  const summary = document.createElement("section");
  summary.className = RECORD_SUMMARY_CLASS;
  summary.innerHTML = `<strong>${problems.length ? "Fix first" : "No blockers found"}</strong><span>${problems.length ? "Churvox found the fields blocking clean admin." : "This record is complete enough to review."}</span><ul>${problems.map((problem) => `<li class="${problem.severity === "warning" ? "warn" : ""}"><b>${problem.title}</b><small>${problem.detail || "Needs attention"}</small></li>`).join("")}</ul>`;
  body.insertBefore(summary, detail);
}

function run() {
  document.querySelectorAll(DRAWER_SELECTOR).forEach(enhanceDrawer);
  document.querySelectorAll(RECORD_POPUP_SELECTOR).forEach(enhanceRecordPopup);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    run();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("input", schedule, true);
  window.addEventListener("change", schedule, true);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("popstate", schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}

export {};
