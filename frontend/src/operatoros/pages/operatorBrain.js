import { clientOf, idOf, moneyOf, statusSlug, titleOf } from "../api";

function text(value) {
  return String(value || "").toLowerCase().trim();
}

function words(value) {
  return text(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function includesAny(haystack, needles) {
  const h = text(haystack);
  return needles.some((needle) => needle && h.includes(text(needle)));
}

function fieldText(item, fields) {
  return fields.map((field) => item?.[field]).filter(Boolean).join(" ");
}

function dateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function jobDate(job) {
  return dateOnly(
    job?.scheduled_date ||
      job?.schedule_date ||
      job?.start_date ||
      job?.date ||
      job?.due_date ||
      job?.created_at
  );
}

function jobRegion(job) {
  return text(job?.region || job?.area || job?.suburb || job?.city || job?.location_region);
}

function workerRegion(worker) {
  return text(worker?.region || worker?.area || worker?.suburb || worker?.city || worker?.base_region);
}

function jobSkillText(job) {
  return fieldText(job, [
    "title",
    "job_title",
    "service_type",
    "trade",
    "category",
    "description",
    "notes",
    "address",
    "site_address",
  ]);
}

function workerSkillText(worker) {
  return fieldText(worker, [
    "skills",
    "skill",
    "trade",
    "trades",
    "experience",
    "notes",
    "role",
    "job_experience",
  ]);
}

function assignedWorkerId(job) {
  return (
    job?.assigned_worker_id ||
    job?.worker_id ||
    job?.assigned_to ||
    job?.assigned_user_id ||
    job?.worker?.id ||
    job?.worker?._id ||
    ""
  );
}

function assignedWorkerName(job) {
  return text(job?.assigned_worker_name || job?.worker_name || job?.assigned_to_name || job?.worker?.name);
}

function isActiveJob(job) {
  return !["completed", "done", "closed", "cancelled", "canceled"].includes(statusSlug(job));
}

function countWorkerJobs(worker, jobs = []) {
  const wid = idOf(worker);
  const wname = text(titleOf(worker, ""));
  return jobs.filter((job) => {
    if (!isActiveJob(job)) return false;
    const jid = assignedWorkerId(job);
    const jname = assignedWorkerName(job);
    return (wid && jid === wid) || (wname && jname && jname === wname);
  }).length;
}

function hasScheduleConflict(worker, job, jobs = []) {
  const wid = idOf(worker);
  const wname = text(titleOf(worker, ""));
  const targetDate = jobDate(job);
  if (!targetDate) return false;

  return jobs.some((other) => {
    if (!isActiveJob(other)) return false;
    if ((idOf(other) || other?._id) === (idOf(job) || job?._id)) return false;

    const otherDate = jobDate(other);
    if (!otherDate || otherDate !== targetDate) return false;

    const otherWorkerId = assignedWorkerId(other);
    const otherWorkerName = assignedWorkerName(other);

    return (wid && otherWorkerId === wid) || (wname && otherWorkerName && otherWorkerName === wname);
  });
}

function scoreWorker(worker, job, data = {}) {
  const jobs = data.jobs || [];
  const reasons = [];
  let score = 0;

  const wr = workerRegion(worker);
  const jr = jobRegion(job);

  if (wr && jr && wr === jr) {
    score += 35;
    reasons.push("same region");
  } else if (wr && jr && (wr.includes(jr) || jr.includes(wr))) {
    score += 22;
    reasons.push("near region match");
  } else if (!jr) {
    score += 5;
    reasons.push("job has no region set");
  }

  const skillWords = unique(words(jobSkillText(job)).filter((w) => w.length >= 4));
  const workerSkill = workerSkillText(worker);
  const matchedSkills = skillWords.filter((w) => text(workerSkill).includes(w)).slice(0, 4);

  if (matchedSkills.length) {
    score += Math.min(30, matchedSkills.length * 8);
    reasons.push(`skill match: ${matchedSkills.join(", ")}`);
  }

  const workload = countWorkerJobs(worker, jobs);
  if (workload === 0) {
    score += 20;
    reasons.push("no active assigned jobs");
  } else if (workload <= 2) {
    score += 10;
    reasons.push(`${workload} active job${workload > 1 ? "s" : ""}`);
  } else {
    score -= Math.min(20, workload * 4);
    reasons.push(`${workload} active jobs already`);
  }

  const status = statusSlug(worker, "active");
  if (["active", "available", "ready", "worker", ""].includes(status)) {
    score += 10;
    reasons.push("available/active");
  } else {
    score -= 20;
    reasons.push(`worker status: ${status.replaceAll("_", " ")}`);
  }

  const conflict = hasScheduleConflict(worker, job, jobs);
  if (conflict) {
    score -= 35;
    reasons.push("possible schedule conflict");
  }

  return {
    worker,
    score,
    workload,
    conflict,
    reasons,
  };
}

export function chooseBestWorker(job, data = {}) {
  const workers = data.availableWorkers?.length ? data.availableWorkers : data.workers || [];
  const scored = workers
    .filter(Boolean)
    .map((worker) => scoreWorker(worker, job, data))
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

function jobAmount(job) {
  return Number(
    job?.total ||
      job?.amount ||
      job?.price ||
      job?.fixed_price ||
      job?.job_price ||
      job?.invoice_total ||
      0
  );
}

function serviceName(job) {
  return (
    job?.service_type ||
    job?.trade ||
    job?.category ||
    job?.title ||
    job?.job_title ||
    "Completed service"
  );
}

function addressOf(job) {
  return job?.address || job?.site_address || job?.location || "";
}

export function invoiceDescriptionForJob(job) {
  const service = serviceName(job);
  const client = clientOf(job);
  const address = addressOf(job);
  const notes = job?.completion_summary || job?.completion_notes || job?.notes || job?.description || "";

  const parts = [
    service,
    address ? `at ${address}` : "",
    client && client !== "No client set" ? `for ${client}` : "",
  ].filter(Boolean);

  const firstLine = parts.join(" ");
  const noteLine = notes ? `Work notes: ${String(notes).slice(0, 220)}` : "";

  return [firstLine, noteLine].filter(Boolean).join("\n\n");
}

function paymentReminderMessage(invoice) {
  const client = clientOf(invoice);
  const amount = moneyOf(invoice);
  const invoiceNumber = invoice?.invoice_number || invoice?.number || titleOf(invoice, "your invoice");

  return `Hi ${client}, just a friendly reminder that ${invoiceNumber} for ${amount} is still waiting. Please let us know if you need anything from us. Thanks.`;
}

function quoteFollowupMessage(quote) {
  const client = clientOf(quote);
  const amount = moneyOf(quote);
  const quoteName = quote?.quote_number || quote?.number || titleOf(quote, "the quote");

  return `Hi ${client}, just checking in on ${quoteName}${amount !== "—" ? ` for ${amount}` : ""}. Happy to answer any questions or get this booked in for you.`;
}

export function buildAiActions(data = {}) {
  const actions = [];

  (data.unassignedJobs || []).slice(0, 8).forEach((job, index) => {
    const match = chooseBestWorker(job, data);
    const worker = match?.worker;
    const workerName = worker ? titleOf(worker, "best worker") : "best available worker";

    actions.push({
      id: `assign-${idOf(job) || index}`,
      type: "DISPATCH",
      icon: "♧",
      title: worker
        ? `Assign ${workerName} to ${titleOf(job, "unassigned job")}`
        : `Find crew for ${titleOf(job, "unassigned job")}`,
      summary: worker
        ? `${workerName} scored ${Math.max(0, Math.round(match.score))}/100 for this job.`
        : `${clientOf(job)} needs a worker, but no available worker data is ready.`,
      why: worker
        ? [
            "Job has no assigned worker",
            ...match.reasons.map((reason) => `Match reason: ${reason}`),
            "Owner approval required before assignment",
          ]
        : ["Job has no assigned worker", "No available worker record found", "Owner needs to add or activate crew"],
      guardrail: match?.conflict
        ? "Possible schedule conflict detected. Owner must review before assignment."
        : "Owner approval required before any worker assignment changes.",
      risk: match?.conflict ? "Medium" : worker ? "Low" : "Needs info",
      status: worker ? "ready" : "needs info",
      execute: worker ? "assign_worker" : "open_crew",
      fields: {
        job_id: idOf(job),
        job_title: titleOf(job, "Job"),
        client_name: clientOf(job),
        job_region: jobRegion(job),
        scheduled_date: jobDate(job),
        worker_id: idOf(worker),
        worker_name: workerName,
        worker_score: match ? Math.max(0, Math.round(match.score)) : "",
        match_reasons: match ? match.reasons.join(", ") : "",
        possible_conflict: match?.conflict ? "yes" : "no",
      },
    });
  });

  (data.completedJobs || []).slice(0, 8).forEach((job, index) => {
    const amount = jobAmount(job);
    const description = job.ai_invoice_description || invoiceDescriptionForJob(job);

    actions.push({
      id: `invoice-${idOf(job) || index}`,
      type: "PROOF TO PAID",
      icon: "✓",
      title: `Create draft invoice for ${titleOf(job, "completed job")}`,
      summary: amount > 0
        ? `${clientOf(job)} has completed work ready to invoice for ${moneyOf(job)}.`
        : `${clientOf(job)} has completed work ready for invoice review, but pricing needs checking.`,
      why: [
        "Job is completed",
        "AI prepared invoice wording from job details and notes",
        amount > 0 ? "Job has a pricing source" : "No price found yet — owner should check amount",
        "Draft only until owner approves sending",
      ],
      guardrail: "Draft invoice only. Nothing is sent to the client without owner approval.",
      risk: amount > 0 ? "Medium" : "Needs info",
      status: "ready",
      execute: "draft_invoice",
      fields: {
        job_id: idOf(job),
        job_title: titleOf(job, "Completed job"),
        client_name: clientOf(job),
        amount,
        description,
      },
    });
  });

  (data.unpaidInvoices || []).slice(0, 8).forEach((invoice, index) => {
    const overdue = statusSlug(invoice).includes("overdue");

    actions.push({
      id: `reminder-${idOf(invoice) || index}`,
      type: "MONEY WATCH",
      icon: "▥",
      title: `Prepare payment reminder for ${titleOf(invoice, "invoice")}`,
      summary: `${clientOf(invoice)} has ${moneyOf(invoice)} waiting${overdue ? " and it appears overdue" : ""}.`,
      why: [
        "Invoice is not marked paid",
        overdue ? "Invoice appears overdue" : "Invoice may need a friendly follow-up",
        "Message remains draft until owner approves",
      ],
      guardrail: "Reminder is drafted only. Nothing is sent without owner approval.",
      risk: overdue ? "Medium" : "Low",
      status: "ready",
      execute: "draft_message",
      fields: {
        invoice_id: idOf(invoice),
        client_name: clientOf(invoice),
        amount: moneyOf(invoice),
        message: paymentReminderMessage(invoice),
      },
    });
  });

  (data.openQuotes || []).slice(0, 8).forEach((quote, index) => {
    actions.push({
      id: `quote-${idOf(quote) || index}`,
      type: "QUOTE FOLLOW-UP",
      icon: "▤",
      title: `Follow up quote for ${clientOf(quote)}`,
      summary: "Open quote waiting for customer response.",
      why: ["Quote is still open", "Follow-up can recover work", "Draft remains editable"],
      guardrail: "Owner edits and approves before sending.",
      risk: "Low",
      status: "ready",
      execute: "draft_message",
      fields: {
        quote_id: idOf(quote),
        client_name: clientOf(quote),
        amount: moneyOf(quote),
        message: quoteFollowupMessage(quote),
      },
    });
  });

  if (!data.clients?.length) {
    actions.push({
      id: "import-clients",
      type: "SETUP",
      icon: "⇪",
      title: "Import or add clients",
      summary: "Churvox needs clients before AI can prepare stronger job, quote and invoice actions.",
      why: ["No clients found", "Client history improves AI invoice wording and follow-ups"],
      guardrail: "Owner controls all imports and client edits.",
      risk: "Needs info",
      status: "needs info",
      execute: "open_import",
      fields: { recommended_next_step: "Import MYOB/customer CSV or add first client" },
    });
  }

  if (!data.workers?.length) {
    actions.push({
      id: "add-crew",
      type: "SETUP",
      icon: "♧",
      title: "Add crew for AI dispatch",
      summary: "AI cannot recommend the best worker until workers, regions and skills are saved.",
      why: ["No crew records found", "Worker matching needs region, workload and skills"],
      guardrail: "Owner approves every invite and role.",
      risk: "Needs info",
      status: "needs info",
      execute: "open_crew",
      fields: { recommended_next_step: "Add workers with region and skills" },
    });
  }

  if (Number(data.smsBalance || 0) <= 10) {
    actions.push({
      id: "sms-low",
      type: "SYSTEM",
      icon: "✉",
      title: "SMS credits are low",
      summary: "Top up credits before reminders and customer updates are needed.",
      why: ["Low SMS balance", "Customer reminders need credits"],
      guardrail: "Owner chooses and approves any SMS credit purchase.",
      risk: "Needs info",
      status: "needs info",
      execute: "open_system",
      fields: { recommended_pack: "500 credits for $45" },
    });
  }

  if (!data.myobConnected && ["pro", "enterprise"].includes(String(data.currentPlan || "").toLowerCase())) {
    actions.push({
      id: "myob-connect",
      type: "MYOB",
      icon: "◇",
      title: "MYOB connection needs review",
      summary: "MYOB can be connected from System Centre when ready.",
      why: ["Plan can use MYOB", "Sync is not connected"],
      guardrail: "MYOB sync stays approval-first.",
      risk: "Needs info",
      status: "needs info",
      execute: "open_system",
      fields: { myob_status: "not connected" },
    });
  }

  return actions.slice(0, 30);
}
