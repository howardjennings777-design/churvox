const mongoose = require("mongoose");

const CommandAuditSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.Mixed, default: null },
    action: { type: String, required: true },
    at: { type: Date, default: Date.now },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const CommandSlipSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },

    dedupeKey: {
      type: String,
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ["job", "invoice", "quote", "worker", "client", "message", "setup", "system"],
      default: "system",
      index: true,
    },

    sourceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },

    actionType: {
      type: String,
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    info: { type: String, default: "" },
    found: { type: String, default: "" },
    prepared: { type: String, default: "" },
    why: { type: String, default: "" },
    owner: { type: String, default: "Approve, edit, snooze, ignore, or open." },
    area: { type: String, default: "Needs approval" },
    page: { type: String, default: "smart" },

    urgency: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "edited", "approved", "snoozed", "ignored", "completed"],
      default: "open",
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    snoozeUntil: { type: Date, default: null, index: true },
    approvedAt: { type: Date, default: null },
    ignoredAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },

    audit: {
      type: [CommandAuditSchema],
      default: [],
    },
  },
  { timestamps: true }
);

CommandSlipSchema.index({ businessId: 1, dedupeKey: 1 }, { unique: true });
CommandSlipSchema.index({ businessId: 1, status: 1, urgency: 1, updatedAt: -1 });

module.exports = mongoose.models.CommandSlip || mongoose.model("CommandSlip", CommandSlipSchema);
