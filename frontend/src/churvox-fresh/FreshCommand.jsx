import React from "react";

const slips = [
  {
    title: "Invoice ready to approve",
    area: "Money desk · Aroha Property Care",
    found: "Completed lawn service has price, notes and GST ready.",
    why: "Approve it before anything is sent to the customer.",
  },
  {
    title: "Quote needs follow-up",
    area: "Quotes · Birchville Rentals",
    found: "Sent quote has had no response for 6 days.",
    why: "A polite follow-up can recover work without you digging around.",
  },
  {
    title: "Client missing billing email",
    area: "Clients · Birchville Rentals",
    found: "Service details exist but billing email is blank.",
    why: "Invoices and reminders should not run with missing billing details.",
  },
  {
    title: "Worker has not acknowledged",
    area: "Dispatch · Today",
    found: "A job is assigned but the worker has not acknowledged it yet.",
    why: "You should confirm before the route starts.",
  },
];

const today = [
  ["10:00", "Lawn service", "Aroha Property Care", "Assigned"],
  ["1:30", "Garden tidy", "Lower Hutt Medical Centre", "In progress"],
  ["Awaiting", "Driveway clean", "Birchville Rentals", "Needs access"],
];

const money = [
  ["Draft invoice", "Aroha Property Care", "$85"],
  ["Approved invoice", "Lower Hutt Medical Centre", "$420"],
  ["Overdue", "Birchville Rentals", "$190"],
];

export default function FreshCommand() {
  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Command</span>
        <h1>Command</h1>
        <p>Your owner control room: approvals, today's work, money, client issues and worker issues in one place.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Today control</h2>
          <p>What needs the owner before the day gets messy.</p>
          {today.map(([time, job, client, status]) => (
            <div className={`freshItem ${status.includes("Needs") ? "need" : ""}`} key={`${job}-${client}`}>
              <b>{time} · {job}</b>
              <span>{client} · {status}</span>
            </div>
          ))}
        </aside>

        <section className="freshCard">
          <h2>Approval queue</h2>
          <p>Churvox does the admin. You approve.</p>
          {slips.map((slip) => (
            <details className="freshSlip" key={slip.title}>
              <summary>{slip.title}</summary>
              <p><b>{slip.area}</b></p>
              <p><b>AI found:</b> {slip.found}</p>
              <p><b>Why:</b> {slip.why}</p>
              <div className="freshActions">
                <button className="freshPrimary">Approve</button>
                <button className="freshDark">Save edit</button>
                <button className="freshGhost">Decline</button>
              </div>
            </details>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Money watch</h2>
          <p>Money items that should not be hidden in invoices.</p>
          {money.map(([status, client, value]) => (
            <div className={`freshItem ${status === "Overdue" ? "need" : ""}`} key={`${status}-${client}`}>
              <b>{status}</b>
              <span>{client} · {value}</span>
            </div>
          ))}
          <div className="freshActions">
            <button className="freshOrange">Review money</button>
            <button className="freshDark">Open invoices</button>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Owner shortcuts</h2>
          <p>Fast actions from Command without turning it into a messy dashboard.</p>
          <div className="freshActions">
            <button className="freshPrimary">Create job</button>
            <button className="freshOrange">Create quote</button>
            <button className="freshDark">Add client</button>
          </div>
        </section>
        <aside className="freshCard">
          <h2>Setup warnings</h2>
          <div className="freshItem need"><b>Billing email missing</b><span>1 client needs billing details before automation.</span></div>
          <div className="freshItem need"><b>Worker acknowledgement</b><span>1 assigned job has not been accepted.</span></div>
        </aside>
      </section>
    </section>
  );
}
