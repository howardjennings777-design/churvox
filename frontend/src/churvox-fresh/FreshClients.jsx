import React from "react";

const clients = [
  ["Aroha Property Care", "office@arohaproperty.co.nz", "Ready"],
  ["Birchville Rentals", "manager@birchvillerentals.co.nz", "Needs billing"],
  ["Lower Hutt Medical Centre", "admin@lhmedical.example", "Ready"],
];

export default function FreshClients() {
  return (
    <section>
      <header className="freshHero"><span>Churvox fresh · Clients</span><h1>Client records</h1><p>Contact, service address, billing details, site notes and next client action.</p></header>
      <section className="freshGrid">
        <aside className="freshCard"><h2>Find client</h2>{clients.map(([name, detail, status], index) => <div className={`freshItem ${status.includes("Needs") ? "need" : ""} ${index === 0 ? "active" : ""}`} key={name}><b>{name}</b><span>{detail} · {status}</span></div>)}</aside>
        <section className="freshCard"><h2>Aroha Property Care</h2><div className="freshTabs"><span>Details</span><span>History</span><span>Notes</span></div><label className="freshField"><span>Client name</span><input value="Aroha Property Care" readOnly /></label><label className="freshField"><span>Email</span><input value="office@arohaproperty.co.nz" readOnly /></label><label className="freshField"><span>Service address</span><input value="42 Rata Street, Naenae" readOnly /></label><label className="freshField"><span>Billing email</span><input value="accounts@arohaproperty.co.nz" readOnly /></label></section>
        <aside className="freshCard"><h2>Next move</h2><p>Save client, create job, create quote, or send missing details to Command.</p><div className="freshActions"><button className="freshPrimary">Save client</button><button className="freshWarn">Create job</button><button className="freshDark">Send to Command</button></div></aside>
      </section>
    </section>
  );
}
