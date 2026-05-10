import React from "react";
import { Brain, CheckCircle2, Clock, DollarSign, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import "../styles/v3.css";

const safeValue = (value) => {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
};

export default function V3ChurvoxEdge({
  section = "dashboard",
  stats = [],
  itemCount = 0,
  decisions = 0,
  unassigned = 0,
  money = 0,
  proof = 0,
  loading = false,
  onPrepare,
  onOpenCard,
}) {
  const statOne = stats?.[0]?.[2] ?? itemCount ?? 0;
  const statTwo = stats?.[1]?.[2] ?? unassigned ?? 0;
  const statThree = stats?.[2]?.[2] ?? money ?? 0;

  const nextMove =
    decisions > 0
      ? "Review Owner Decisions first."
      : unassigned > 0
      ? "Run Crew Match and assign the best worker."
      : money > 0
      ? "Open Money Board and approve reminders or draft invoices."
      : proof > 0
      ? "Check Proof-to-Paid before invoicing."
      : "Run Churvox check and let AI prepare the next move.";

  const cards = [
    {
      icon: Brain,
      label: "AI Operator",
      value: decisions || statOne,
      copy: "Prepares the safest next actions for owner approval.",
      detail: {
        kind: "summary",
        kicker: "AI Operator",
        title: "AI Operator control",
        copy: "Churvox finds jobs, quotes, invoices and follow-ups that need action, then prepares the work for the owner to approve.",
        reason: "This keeps the app powerful without letting AI send, delete, bill or change risky records on its own.",
        href: "/v3/decisions",
        fields: [["Waiting decisions", decisions || statOne], ["Approval mode", "Owner first"], ["Safety", "On"]],
      },
    },
    {
      icon: Users,
      label: "Crew Match",
      value: unassigned || statTwo,
      copy: "Matches work by area, timing, load and job fit.",
      detail: {
        kind: "summary",
        kicker: "Crew Match",
        title: "AI dispatch matching",
        copy: "Churvox looks for unassigned work and recommends the best crew option before anyone is assigned.",
        reason: "This helps the owner move faster while still checking the match before it becomes real.",
        href: "/v3/dispatch",
        fields: [["Unassigned jobs", unassigned || statTwo], ["Match signals", "Area, timing, load"], ["Owner action", "Approve assignment"]],
      },
    },
    {
      icon: DollarSign,
      label: "Proof-to-Paid",
      value: money || proof || statThree,
      copy: "Moves completed work toward invoice-ready action.",
      detail: {
        kind: "summary",
        kicker: "Proof-to-Paid",
        title: "Proof-to-Paid workflow",
        copy: "Churvox checks completed work, proof, photos, draft invoices and unpaid money so the owner can approve the next billing step.",
        reason: "The value is not just creating invoices. It is making sure finished work keeps moving until it is paid.",
        href: "/v3/proof",
        fields: [["Money / proof items", money || proof || statThree], ["Flow", "Completed to paid"], ["Risk", "Approval-first"]],
      },
    },
    {
      icon: ShieldCheck,
      label: "Owner Control",
      value: "ON",
      copy: "Risky sends, deletes, payroll and billing stay locked.",
      detail: {
        kind: "summary",
        kicker: "Owner Control",
        title: "Owner-approved automation",
        copy: "Churvox can prepare the work, but important business actions stay behind owner approval.",
        reason: "This is the clean line: AI does the admin preparation, the owner controls the final action.",
        href: "/v3/decisions",
        fields: [["Risky actions", "Locked"], ["Owner approval", "Required"], ["Status", "On"]],
      },
    },
  ];

  return (
    <section className="cvx-edge">
      <div className="cvx-edge-main">
        <div className="cvx-edge-badge">
          <Sparkles size={15} />
          <span>Churvox AI Trade OS</span>
        </div>

        <h2>Your AI operator, not another dashboard.</h2>
        <p>
          Churvox reviews the business, finds the next move, explains why it matters,
          prepares the work, then waits for the owner before anything important happens.
        </p>

        <div className="cvx-next-move">
          <Zap size={18} />
          <div>
            <small>Next best move</small>
            <b>{loading ? "Checking Churvox intelligence…" : nextMove}</b>
          </div>
        </div>
      </div>

      <div className="cvx-edge-grid">
        {cards.map(({ icon: Icon, label, value, copy, detail }) => (
          <button type="button" className="cvx-edge-card" key={label} onClick={() => onOpenCard?.(detail)}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{safeValue(value)}</strong>
            <small>{copy}</small>
          </button>
        ))}
      </div>

      <div className="cvx-edge-actions">
        <button type="button" className="cvx-edge-primary" onClick={onPrepare}>
          <Sparkles size={18} />
          Prepare next moves
        </button>
        <div className="cvx-edge-proof">
          <Clock size={16} />
          <span>{section === "dashboard" ? "Smart Hub" : section.replace(/[-_]/g, " ")} is AI-assisted and approval-first.</span>
        </div>
      </div>
    </section>
  );
}
