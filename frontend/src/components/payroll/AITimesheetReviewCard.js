import React from "react";
import { Bot, Info, ShieldCheck, TrendingUp } from "lucide-react";

const heroStyle = {
  background:
    "radial-gradient(circle at 88% 10%, rgba(56, 189, 248, 0.38), transparent 18rem), linear-gradient(135deg, #073b91 0%, #0b5bd3 52%, #0744a3 100%)",
  color: "#ffffff",
  border: "1px solid rgba(191, 219, 254, 0.34)",
  boxShadow: "0 24px 70px rgba(37, 99, 235, 0.20)",
  opacity: 1,
};

const glassStyle = {
  background: "rgba(255, 255, 255, 0.14)",
  border: "1px solid rgba(219, 234, 254, 0.28)",
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
            <Bot size={14} style={{ color: "#dbeafe" }} />
            <span style={{ color: "#ffffff" }}>AI Timesheet Review</span>
          </div>
          <h2 className="mt-3 text-2xl font-black" style={{ color: "#ffffff" }}>{title}</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "#eaf4ff" }}>{aiReview?.brief}</p>
        </div>
        <div className="rounded-2xl px-4 py-3 text-center" style={glassStyle}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#dbeafe" }}>Confidence</p>
          <p className="mt-1 text-lg font-black" style={{ color: "#ffffff" }}>{aiReview?.confidence || "Review"}</p>
          <p className="text-xs" style={{ color: "#eaf4ff" }}>Approval-first</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <Info size={16} style={{ color: "#dbeafe" }} /> What this means
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#eaf4ff" }}>AI reviews the handoff only. It does not approve payroll, change rates, lodge tax, pay workers, or export files without you.</p>
        </div>
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <TrendingUp size={16} style={{ color: "#dbeafe" }} /> Hours summary
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#eaf4ff" }}>Total recorded: {Number(aiReview?.totalHours || 0).toFixed(2)}h · Approved: {Number(aiReview?.approvedHours || 0).toFixed(2)}h · Pending: {pendingCount}</p>
        </div>
        <div className="rounded-2xl p-4" style={glassStyle}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#ffffff" }}>
            <ShieldCheck size={16} style={{ color: "#dbeafe" }} /> Export rule
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "#eaf4ff" }}>Export only after rates are set, time is approved, and flagged entries are reviewed.</p>
        </div>
      </div>
    </section>
  );
}
