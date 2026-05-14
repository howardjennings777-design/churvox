import React, { useState } from "react";
import "./AIActionDock.css";

export default function AIActionDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="ai-dock-button" type="button" onClick={() => setOpen(true)}>
        <span>AI</span>
        <strong>4 ready</strong>
      </button>

      {open ? (
        <div className="ai-dock-backdrop" onClick={() => setOpen(false)}>
          <section className="ai-dock-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>AI Operator</span>
                <h2>Prepared actions</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </header>

            {[
              ["Dispatch", "Unassigned job found", "Review worker recommendation"],
              ["Invoice", "Draft invoice prepared", "Review invoice draft"],
              ["Quote", "Follow-up ready", "Approve message"],
              ["Cashflow", "Payment reminder drafted", "Review reminder"],
            ].map(([type, title, action]) => (
              <article key={title}>
                <span>{type}</span>
                <strong>{title}</strong>
                <p>{action}</p>
                <button type="button">Review</button>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </>
  );
}
