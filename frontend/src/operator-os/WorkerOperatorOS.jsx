import React, { useMemo, useState } from "react";
import WorkerCockpitPage from "../pages/worker/WorkerCockpitPage";
import "./operator-os.css";

export default function WorkerOperatorOS() {
  const [online, setOnline] = useState(true);
  const [proof, setProof] = useState({ nav: false, start: false, before: false, after: false, note: false, complete: false });
  const nextJob = useMemo(() => ({ address: "Open assigned job for live details" }), []);
  return <div className="worker-os">
    <div className="worker-top"><h2>Worker Operator</h2><label><input type="checkbox" checked={online} onChange={()=>setOnline(!online)} /> {online?"Online":"Offline"}</label></div>
    <div className="worker-card"><h3>Next job first</h3><p>{nextJob.address}</p><a className="mint" href="https://maps.google.com" target="_blank" rel="noreferrer">Navigate</a></div>
    <div className="worker-card"><h3>Proof checklist</h3>{Object.keys(proof).map(k=><label key={k}><input type="checkbox" checked={proof[k]} onChange={()=>setProof({...proof,[k]:!proof[k]})}/>{k}</label>)}</div>
    <div className="worker-card"><p>Route order + next job guidance. No all-day tracking.</p></div>
    <WorkerCockpitPage />
  </div>;
}
