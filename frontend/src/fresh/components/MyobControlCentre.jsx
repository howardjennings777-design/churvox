import React, { useEffect, useState } from "react";
import "./myobControlCentre.css";

const planText = {
  solo: "Solo: MYOB unavailable",
  team: "Team: MYOB unavailable",
  pro: "Pro: MYOB optional add-on",
  enterprise: "Enterprise: MYOB included",
};

export default function MyobControlCentre({ api, plan = "solo" }) {
  const [status, setStatus] = useState({});
  const [error, setError] = useState("");
  const [mode, setMode] = useState("churvox_only");

  useEffect(() => {
    api("/myob/status-lite").then(setStatus).catch(() => setError("Safe placeholder only: status-lite unavailable."));
  }, [api]);

  return <section className="myob-card"><h3>MYOB Control Centre</h3><div className="myob-grid"><article><strong>Plan access</strong><p>{planText[String(plan).toLowerCase()] || "Plan unknown"}</p></article><article><strong>Connection</strong><p>{error || (status.connected ? "Configured (verify before write)" : "Not connected")}</p></article><article><strong>Invoice authority mode</strong><div className="mode-row"><button onClick={() => setMode("churvox_only")} className={mode==="churvox_only"?"active":""}>Churvox only</button><button onClick={() => setMode("sync")} className={mode==="sync"?"active":""}>Churvox + MYOB sync</button><button onClick={() => setMode("official")} className={mode==="official"?"active":""}>MYOB official source</button></div></article><article><strong>Payment sync</strong><p>{status.payment_sync_status || "Draft only"}</p></article><article><strong>Review queue</strong><p>{Array.isArray(status.invoice_queue) ? status.invoice_queue.length : 0} items awaiting owner approval.</p></article></div><div className="guardrail"><p>No MYOB write without owner approval</p><p>No payment overwrite without review</p><p>No accounting source change without approval</p></div></section>;
}
