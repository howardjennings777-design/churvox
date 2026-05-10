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
      copy: "Finds work, prepares actions, waits for approval.",
    },
    {
      icon: Users,
      label: "Crew Match",
      value: unassigned || statTwo,
      copy: "Matches work by area, load, timing and fit.",
    },
    {
      icon: DollarSign,
      label: "Proof-to-Paid",
      value: money || proof || statThree,
      copy: "Turns completed work into invoice-ready actions.",
    },
    {
      icon: ShieldCheck,
      label: "Owner Control",
      value: "ON",
      copy: "No risky sends, deletes, payroll or billing without approval.",
    },
  ];

  return (
    <section className="cvx-edge">
      <div className="cvx-edge-main">
        <div className="cvx-edge-badge">
          <Sparkles size={15} />
          <span>Churvox AI Trade OS</span>
        </div>

        <h2>Not a dashboard. A business operator.</h2>
        <p>
          Churvox checks the business, finds the next move, explains why, prepares the work,
          and lets the owner approve before anything important happens.
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
        {cards.map(({ icon: Icon, label, value, copy }) => (
          <button type="button" className="cvx-edge-card" key={label}>
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
