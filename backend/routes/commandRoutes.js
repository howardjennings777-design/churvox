const express = require("express");
const mongoose = require("mongoose");
const CommandSlip = require("../models/CommandSlip");

const router = express.Router();

function optionalModel(names) {
  for (const name of names) {
    try {
      return require(`../models/${name}`);
    } catch {
      // Try next name.
    }
  }

  for (const name of names) {
    try {
      return mongoose.model(name);
    } catch {
      // Try next name.
    }
  }

  return null;
}

const Job = optionalModel(["Job", "Jobs", "job"]);
const Invoice = optionalModel(["Invoice", "Invoices", "invoice"]);
const Quote = optionalModel(["Quote", "Quotes", "quote"]);
const Client = optionalModel(["Client", "Clients", "Customer", "Customers"]);

function getBusinessId(req) {
  return (
    req.user?.businessId ||
    req.user?.business?._id ||
    req.user?.business ||
    req.businessId ||
    req.business?._id ||
    "demo-business"
  );
}

function getActor(req) {
  return {
    userId: req.user?._id || req.user?.id || null,
    email: req.user?.email || null,
    name: req.user?.name || req.user?.fullName || null,
  };
}

function normaliseId(value) {
  if (!value) return null;
  if (value._id) return String(value._id);
  return String(value);
}

function nowIsoInfo() {
  return new Date().toISOString();
}

function commandAreaFromAction(actionType) {
  const raw = String(actionType || "").toLowerCase();

  if (raw.includes("invoice") || raw.includes("payment") || raw.includes("quote") || raw.includes("price") || raw.includes("cash")) return "Money";
  if (raw.includes("worker") || raw.includes("plan") || raw.includes("schedule") || raw.includes("job")) return "Today";
  if (raw.includes("client") || raw.includes("customer") || raw.includes("message") || raw.includes("review") || raw.includes("rebook")) return "Customers";
  if (raw.includes("setup") || raw.includes("missing")) return "Setup";

  return "Needs approval";
}

function makeSlip({
  businessId,
  sourceType = "system",
  sourceId = null,
  actionType = "owner_review",
  title,
  info = "",
  found = "",
  prepared = "",
  why = "",
  owner = "Approve, edit, snooze, ignore, or open.",
  urgency = "Medium",
  page = "smart",
  payload = {},
}) {
  const safeSourceId = normaliseId(sourceId) || "none";
  const dedupeKey = `${sourceType}:${safeSourceId}:${actionType}`;

  return {
    businessId,
    dedupeKey,
    sourceType,
    sourceId: safeSourceId,
    actionType,
    title,
    info,
    found,
    prepared,
    why,
    owner,
    urgency,
    area: commandAreaFromAction(actionType),
    page,
    payload,
    status: "open",
  };
}

async function upsertSlip(data) {
  const before = await CommandSlip.findOne({
    businessId: data.businessId,
    dedupeKey: data.dedupeKey,
  });

  const slip = await CommandSlip.findOneAndUpdate(
    { businessId: data.businessId, dedupeKey: data.dedupeKey },
    {
      $setOnInsert: {
        ...data,
        audit: [
          {
            action: "created_by_command_scan",
            at: new Date(),
            after: data,
            note: "Command created this slip from real business data scan.",
          },
        ],
      },
      $set: {
        title: data.title,
        info: data.info,
        found: data.found,
        prepared: data.prepared,
        why: data.why,
        owner: data.owner,
        urgency: data.urgency,
        area: data.area,
        page: data.page,
        payload: data.payload,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { slip, created: !before };
}

async function safeFind(Model, query, limit = 80) {
  if (!Model) return [];

  try {
    return await Model.find(query).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).lean();
  } catch {
    return [];
  }
}

function looksCompleted(job) {
  const raw = `${job.status || ""} ${job.stage || ""}`.toLowerCase();
  return raw.includes("complete") || raw.includes("completed") || raw.includes("done") || raw.includes("finished");
}

function hasInvoice(job) {
  return Boolean(job.invoiceId || job.invoice || job.invoiceNumber || job.invoicedAt || job.invoiceStatus === "sent");
}

function hasExtraWork(job) {
  const raw = `${job.notes || ""} ${job.workerNotes || ""} ${job.completionNotes || ""} ${job.description || ""}`.toLowerCase();
  return raw.includes("extra") || raw.includes("additional") || raw.includes("hedge") || raw.includes("dump") || raw.includes("green waste");
}

function isOverdueInvoice(invoice) {
  const status = `${invoice.status || invoice.paymentStatus || invoice.invoiceStatus || ""}`.toLowerCase();
  if (status.includes("paid")) return false;

  const due = invoice.dueDate || invoice.due || invoice.paymentDue || null;
  if (!due) return status.includes("overdue");

  const dueDate = new Date(due);
  return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
}

function isColdQuote(quote) {
  const status = `${quote.status || ""}`.toLowerCase();
  if (status.includes("accept") || status.includes("approved") || status.includes("won")) return false;
  if (status.includes("decline") || status.includes("lost")) return false;

  const sent = quote.sentAt || quote.sentDate || quote.createdAt || null;
  if (!sent) return status.includes("sent");

  const sentDate = new Date(sent);
  if (Number.isNaN(sentDate.getTime())) return false;

  const ageDays = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= 3;
}

function needsWorkerAck(job) {
  const raw = `${job.status || ""} ${job.workerStatus || ""} ${job.assignmentStatus || ""}`.toLowerCase();
  const hasWorker = Boolean(job.assignedTo || job.workerId || job.worker || job.assignee);
  const acknowledged = Boolean(job.acknowledgedAt || job.workerAcknowledgedAt || raw.includes("acknowledged"));
  return hasWorker && !acknowledged && !looksCompleted(job);
}

async function scanCommandSources(businessId) {
  const slips = [];

  const baseQuery = { businessId };

  const jobs = await safeFind(Job, baseQuery, 100);
  const invoices = await safeFind(Invoice, baseQuery, 100);
  const quotes = await safeFind(Quote, baseQuery, 100);
  const clients = await safeFind(Client, baseQuery, 100);

  for (const job of jobs) {
    if (looksCompleted(job) && !hasInvoice(job)) {
      slips.push(makeSlip({
        businessId,
        sourceType: "job",
        sourceId: job._id,
        actionType: "review_invoice",
        title: "Completed job needs invoice",
        info: `${job.title || job.jobTitle || job.name || "Completed job"} · invoice not sent`,
        found: "Churvox found a completed job with no invoice linked.",
        prepared: "Prepare an invoice draft from the completed job.",
        why: "Completed work should become money quickly.",
        urgency: "High",
        page: "invoicecheck",
        payload: { jobId: normaliseId(job._id), job },
      }));
    }

    if (looksCompleted(job) && hasExtraWork(job)) {
      slips.push(makeSlip({
        businessId,
        sourceType: "job",
        sourceId: job._id,
        actionType: "approve_invoice_extra",
        title: "Possible extra work found",
        info: `${job.title || job.jobTitle || job.name || "Completed job"} · check extras`,
        found: "Churvox found worker notes/photos that may include extra billable work.",
        prepared: "Prepare invoice extra for owner approval before sending.",
        why: "Extras can be missed if the owner has to manually read every note.",
        urgency: "High",
        page: "invoicecheck",
        payload: { jobId: normaliseId(job._id), job },
      }));
    }

    if (needsWorkerAck(job)) {
      slips.push(makeSlip({
        businessId,
        sourceType: "job",
        sourceId: job._id,
        actionType: "send_worker_brief",
        title: "Worker has not acknowledged job",
        info: `${job.title || job.jobTitle || job.name || "Assigned job"} · acknowledgement missing`,
        found: "Churvox found an assigned job without worker acknowledgement.",
        prepared: "Prepare worker reminder or backup dispatch action.",
        why: "Owner should know before the customer is affected.",
        urgency: "High",
        page: "workerbrief",
        payload: { jobId: normaliseId(job._id), job },
      }));
    }
  }

  for (const invoice of invoices) {
    if (isOverdueInvoice(invoice)) {
      slips.push(makeSlip({
        businessId,
        sourceType: "invoice",
        sourceId: invoice._id,
        actionType: "send_payment_reminder",
        title: "Overdue invoice needs chasing",
        info: `${invoice.invoiceNumber || invoice.number || "Invoice"} · ${invoice.clientName || invoice.customerName || "customer"}`,
        found: "Churvox found an invoice that is overdue and not marked paid.",
        prepared: "Prepare a friendly payment reminder for owner approval.",
        why: "Cashflow improves when overdue invoices are followed up early.",
        urgency: "High",
        page: "cashflowai",
        payload: { invoiceId: normaliseId(invoice._id), invoice },
      }));
    }
  }

  for (const quote of quotes) {
    if (isColdQuote(quote)) {
      slips.push(makeSlip({
        businessId,
        sourceType: "quote",
        sourceId: quote._id,
        actionType: "send_quote_followup",
        title: "Quote follow-up ready",
        info: `${quote.quoteNumber || quote.number || "Quote"} · no reply yet`,
        found: "Churvox found a quote that has not been accepted or replied to.",
        prepared: "Prepare a polite follow-up message.",
        why: "Warm quotes can go cold if nobody follows up.",
        urgency: "Medium",
        page: "followupwriter",
        payload: { quoteId: normaliseId(quote._id), quote },
      }));
    }
  }

  if (!clients.length) {
    slips.push(makeSlip({
      businessId,
      sourceType: "setup",
      sourceId: "first-client",
      actionType: "fix_setup_step",
      title: "Add your first client",
      info: "Setup · first client missing",
      found: "Churvox could not find a client record for this business.",
      prepared: "Open the client area and add or import clients.",
      why: "Jobs, quotes and invoices need clients before Command can work properly.",
      urgency: "Medium",
      page: "clients",
      payload: { setupStep: "first-client" },
    }));
  }

  if (!slips.length) {
    slips.push(makeSlip({
      businessId,
      sourceType: "system",
      sourceId: "all-clear",
      actionType: "owner_review",
      title: "Nothing urgent found",
      info: "Command scan complete",
      found: "Churvox scanned jobs, invoices, quotes, workers and setup.",
      prepared: "No urgent owner approvals were found.",
      why: "Command will show work here when something needs attention.",
      urgency: "Low",
      page: "smart",
      payload: { scannedAt: nowIsoInfo() },
    }));
  }

  const saved = [];
  for (const slip of slips) {
    const result = await upsertSlip(slip);
    saved.push(result.slip);
  }

  return saved;
}

function publicSlip(slip) {
  return {
    id: String(slip._id),
    businessId: slip.businessId,
    sourceType: slip.sourceType,
    sourceId: slip.sourceId,
    actionType: slip.actionType,
    title: slip.title,
    info: slip.info,
    found: slip.found,
    prepared: slip.prepared,
    why: slip.why,
    owner: slip.owner,
    area: slip.area,
    page: slip.page,
    urgency: slip.urgency,
    status: slip.status,
    payload: slip.payload || {},
    snoozeUntil: slip.snoozeUntil,
    approvedAt: slip.approvedAt,
    ignoredAt: slip.ignoredAt,
    editedAt: slip.editedAt,
    audit: slip.audit || [],
    createdAt: slip.createdAt,
    updatedAt: slip.updatedAt,
  };
}

async function getSlipForBusiness(req, res) {
  const businessId = getBusinessId(req);
  const slip = await CommandSlip.findOne({ _id: req.params.id, businessId });

  if (!slip) {
    res.status(404).json({ ok: false, message: "Command slip not found" });
    return null;
  }

  return slip;
}


router.post("/slips", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const body = req.body || {};
    const actor = getActor(req);

    const sourceType = body.sourceType || body.area || body.group || "system";
    const sourceId =
      body.sourceId ||
      body.id ||
      body.dedupeKey ||
      `${sourceType}-${body.actionType || "owner_review"}-${Date.now()}`;

    const actionType = body.actionType || "owner_review";

    const data = makeSlip({
      businessId,
      sourceType: String(sourceType).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 40) || "system",
      sourceId,
      actionType,
      title: body.title || "Prepared action",
      info: body.info || body.urgency || "",
      found: body.found || "Churvox found something that needs owner review.",
      prepared: body.prepared || "Churvox prepared the next action.",
      why: body.why || body.owner || "This keeps admin moving while the owner stays in control.",
      owner: body.owner || "Approve, edit, snooze, ignore, or open.",
      urgency: body.urgency || "Medium",
      page: body.page || "command",
      payload: {
        ...(body.payload || {}),
        freshSlip: body,
        createdFrom: "send_to_command",
      },
    });

    const existing = await CommandSlip.findOne({
      businessId: data.businessId,
      dedupeKey: data.dedupeKey,
    });

    const slip = await CommandSlip.findOneAndUpdate(
      { businessId: data.businessId, dedupeKey: data.dedupeKey },
      {
        $setOnInsert: {
          ...data,
          audit: [
            {
              by: actor,
              action: "created_from_send_to_command",
              at: new Date(),
              after: data,
              note: "Owner or AI helper sent this item to Command for approval.",
            },
          ],
        },
        $set: {
          title: data.title,
          info: data.info,
          found: data.found,
          prepared: data.prepared,
          why: data.why,
          owner: data.owner,
          urgency: data.urgency,
          area: data.area,
          page: data.page,
          payload: data.payload,
          status: existing?.status === "ignored" || existing?.status === "approved" ? existing.status : "open",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existing) {
      slip.audit.push({
        by: actor,
        action: "updated_from_send_to_command",
        at: new Date(),
        before: publicSlip(existing),
        after: publicSlip(slip),
        note: "Send to Command updated an existing matching slip.",
      });
      await slip.save();
    }

    res.status(existing ? 200 : 201).json({
      ok: true,
      created: !existing,
      slip: publicSlip(slip),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to create Command slip",
    });
  }
});


router.get("/slips", async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    const query = {
      businessId,
      status: { $in: ["open", "edited", "snoozed"] },
    };

    const slips = await CommandSlip.find(query).sort({ urgency: 1, updatedAt: -1 }).limit(160);

    res.json({
      ok: true,
      slips: slips.map(publicSlip),
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to load Command slips" });
  }
});

router.post("/scan", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const slips = await scanCommandSources(businessId);

    res.json({
      ok: true,
      scannedAt: new Date(),
      slips: slips.map(publicSlip),
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to scan Command sources" });
  }
});

router.post("/slips/:id/approve", async (req, res) => {
  try {
    const slip = await getSlipForBusiness(req, res);
    if (!slip) return;

    const before = publicSlip(slip);

    slip.status = "approved";
    slip.approvedAt = new Date();
    slip.audit.push({
      by: getActor(req),
      action: "approved",
      before,
      after: { status: "approved", approvedAt: slip.approvedAt, note: req.body?.note || "" },
      note: req.body?.note || "",
    });

    await slip.save();

    res.json({ ok: true, slip: publicSlip(slip) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to approve Command slip" });
  }
});

router.patch("/slips/:id/edit", async (req, res) => {
  try {
    const slip = await getSlipForBusiness(req, res);
    if (!slip) return;

    const before = publicSlip(slip);
    const allowed = ["title", "info", "found", "prepared", "why", "owner", "urgency", "page", "actionType", "payload"];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        slip[key] = req.body[key];
      }
    }

    slip.status = "edited";
    slip.editedAt = new Date();
    slip.area = commandAreaFromAction(slip.actionType);

    slip.audit.push({
      by: getActor(req),
      action: "edited",
      before,
      after: publicSlip(slip),
      note: req.body?.note || "",
    });

    await slip.save();

    res.json({ ok: true, slip: publicSlip(slip) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to edit Command slip" });
  }
});

router.post("/slips/:id/snooze", async (req, res) => {
  try {
    const slip = await getSlipForBusiness(req, res);
    if (!slip) return;

    const before = publicSlip(slip);
    const snoozeUntil = req.body?.snoozeUntil ? new Date(req.body.snoozeUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    slip.status = "snoozed";
    slip.snoozeUntil = snoozeUntil;
    slip.audit.push({
      by: getActor(req),
      action: "snoozed",
      before,
      after: { status: "snoozed", snoozeUntil },
      note: req.body?.note || "",
    });

    await slip.save();

    res.json({ ok: true, slip: publicSlip(slip) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to snooze Command slip" });
  }
});

router.post("/slips/:id/ignore", async (req, res) => {
  try {
    const slip = await getSlipForBusiness(req, res);
    if (!slip) return;

    const before = publicSlip(slip);

    slip.status = "ignored";
    slip.ignoredAt = new Date();
    slip.audit.push({
      by: getActor(req),
      action: "ignored",
      before,
      after: { status: "ignored", ignoredAt: slip.ignoredAt },
      note: req.body?.note || "",
    });

    await slip.save();

    res.json({ ok: true, slip: publicSlip(slip) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to ignore Command slip" });
  }
});

router.get("/events", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const slips = await CommandSlip.find({ businessId }).sort({ updatedAt: -1 }).limit(40).lean();

    const events = slips.map((slip) => ({
      id: String(slip._id),
      title: slip.title,
      type: slip.sourceType,
      actionType: slip.actionType,
      status: slip.status,
      result: slip.prepared,
      time: slip.updatedAt || slip.createdAt,
    }));

    res.json({ ok: true, events });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to load Command events" });
  }
});

router.get("/audit", async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const slips = await CommandSlip.find({ businessId }).sort({ updatedAt: -1 }).limit(80).lean();

    const audit = slips.flatMap((slip) =>
      (slip.audit || []).map((item) => ({
        slipId: String(slip._id),
        title: slip.title,
        sourceType: slip.sourceType,
        actionType: slip.actionType,
        ...item,
      }))
    );

    res.json({ ok: true, audit });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Failed to load Command audit" });
  }
});

module.exports = router;
