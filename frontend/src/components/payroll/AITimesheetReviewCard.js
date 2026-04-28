import React from "react";
import { Bot, Info, ShieldCheck, TrendingUp } from "lucide-react";

// Matches Smart Hub control tower exactly.
const heroStyle = {
  background: "linear-gradient(135deg, #071120 0%, #0f2746 45%, #0b5bd3 100%)",
  color: "#ffffff",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
  opacity: 1,
};

const glassStyle = {
  background: "rgba(255, 255, 255, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  color: "#ffffff",
  opacity: 1,
};

export default function AITimesheetReviewCard({ aiReview, pendingCount = 0 }) {
  const title = aiReview?.confidence === "High confidence"
    ? "Ready to export"
    : aiReview?.confidence === "Blocked"
      ? "Waiting for worker time"
      : "Review before export";

  return (
    <section className="rounded-3xl p-5" style={heroStyle} data-testid="ai-timesheet-review-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={glassStyle}>
            <Bot size={14} style={{ color: "#bfdbfe" }} />
            <span style={{ color: "#ffffff" }}>AI Timesheet Review</span>
          </div>
          <h2 className="mt-3 text-2xl font-black" style={{ color: "#ffffff" }}>{title}</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "#dbeafe" }}>{aiReview?.brief}</p>
        </div>
        <div className="rounded-2xl px-4 py-3 text-center" style={glassStyle}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#bfdbfe" }}>Confidence</p>
          <p className="mt-1 text-lg font-black" style={{ color: "#ffffff" }}>{aiReview?.confidence || "Review"}</p>
          <p className="text-xs" style={{ color: "#dbeafe" }}>Approval-first</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <Info size={16} style={{ color: "#bfdbfe" }} /> What this means
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#dbeafe" }}>AI reviews the handoff only. It does not approve payroll, change rates, lodge tax, pay workers, or export files without you.</p>
        </div>
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <TrendingUp size={16} style={{ color: "#bfdbfe" }} /> Hours summary
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#dbeafe" }}>Total recorded: {Number(aiReview?.totalHours || 0).toFixed(2)}h · Approved: {Number(aiReview?.approvedHours || 0).toFixed(2)}h · Pending: {pendingCount}</p>
        </div>
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <ShieldCheck size={16} style={{ color: "#bfdbfe" }} /> Export rule
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#dbeafe" }}>Export only after rates are set, time is approved, and flagged entries are reviewed.</p>
        </div>
      </div>
    </section>
  );
}
