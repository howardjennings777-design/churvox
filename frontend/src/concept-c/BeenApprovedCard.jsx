import React from "react";

export default function BeenApprovedCard({ amount = "$0", count = 0, onOpen }) {
  const jobsLabel = count === 1 ? "signed-off job" : "signed-off jobs";
  return (
    <button className="xcf-card xcf-approved-page-card" type="button" onClick={onOpen}>
      <header>
        <span>
          <small>Signed-off work ready for admin</small>
          <b>Been Approved</b>
        </span>
        <strong>{count}</strong>
      </header>
      <div className="xcf-approved-page-hero">
        <span>Approved work</span>
        <b>{amount}</b>
        <small>{count} {jobsLabel}</small>
      </div>
      <p>Tap to open approved work and prepare the next step without leaving Command Floor.</p>
    </button>
  );
}
