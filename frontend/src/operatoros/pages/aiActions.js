import { clientOf, idOf, moneyOf, statusSlug, titleOf } from "../api";

export function buildAiActions(data = {}) {
  const actions = [];
  const worker = (data.availableWorkers || data.workers || [])[0];

  (data.unassignedJobs || []).slice(0, 6).forEach((job, index) => {
    actions.push({
      id: `assign-${idOf(job) || index}`,
      type: "DISPATCH",
      icon: "♧",
      title: worker
        ? `Assign ${titleOf(worker, "best worker")} to ${titleOf(job, "unassigned job")}`
        : `Assign crew to ${titleOf(job, "unassigned job")}`,
      summary: `${clientOf(job)} needs a worker. Churvox prepared an assignment review.`,
      why: ["Job has no assigned worker", "AI checked current crew data", "Owner approval required"],
      guardrail: "Owner approval required before any worker assignment changes.",
      risk: worker ? "Low" : "Needs info",
      status: worker ? "ready" : "needs info",
      execute: "assign_worker",
      fields: {
        job_id: idOf(job),
        job_title: titleOf(job, "Job"),
        worker_id: idOf(worker),
        worker_name: titleOf(worker, "Best available crew"),
      },
    });
  });

  (data.completedJobs || []).slice(0, 6).forEach((job, index) => {
    actions.push({
      id: `invoice-${idOf(job) || index}`,
      type: "PROOF TO PAID",
      icon: "✓",
      title: `Create draft invoice for ${titleOf(job, "completed job")}`,
      summary: `${clientOf(job)} has completed work ready for invoice review.`,
      why: ["Job is completed", "Proof/notes can become invoice wording", "Draft only until owner approves sending"],
      guardrail: "Draft invoice only. Nothing is sent to the client without approval.",
      risk: "Medium",
      status: "ready",
      execute: "draft_invoice",
      fields: {
        job_id: idOf(job),
        client_name: clientOf(job),
        amount: Number(job.total || job.amount || job.price || 0),
        description:
          job.ai_invoice_description ||
          job.completion_summary ||
          job.description ||
          `Completed work for ${clientOf(job)}`,
      },
    });
  });

  (data.unpaidInvoices || []).slice(0, 6).forEach((invoice, index) => {
    actions.push({
      id: `reminder-${idOf(invoice) || index}`,
      type: "MONEY WATCH",
      icon: "▥",
      title: `Prepare payment reminder for ${titleOf(invoice, "invoice")}`,
      summary: `${clientOf(invoice)} has ${moneyOf(invoice)} waiting.`,
      why: ["Invoice is not paid yet", "Cashflow follow-up may be needed", "Message remains draft until owner approves"],
      guardrail: "Reminder is drafted only. Nothing is sent without approval.",
      risk: statusSlug(invoice).includes("overdue") ? "Medium" : "Low",
      status: "ready",
      execute: "draft_message",
      fields: {
        invoice_id: idOf(invoice),
        client_name: clientOf(invoice),
        amount: moneyOf(invoice),
        message: `Hi ${clientOf(invoice)}, just a friendly reminder that ${moneyOf(invoice)} is waiting on your Churvox invoice. Thanks.`,
      },
    });
  });

  (data.openQuotes || []).slice(0, 6).forEach((quote, index) => {
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
        message: `Hi ${clientOf(quote)}, just checking in on the quote we sent through. Happy to answer any questions.`,
      },
    });
  });

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

  return actions;
}
