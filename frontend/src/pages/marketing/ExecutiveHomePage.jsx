import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";
import "./SitesRenderHome.css";

export const Nav = PublicNav;
export const Footer = PublicFooter;

const approvals = [
  ["Quote ready", "Thompson Property", "Hedge trim and green waste", "$340"],
  ["Worker update", "Tomorrow · 8:30am", "Arrival moved by 30 minutes", "Review"],
  ["Completed job", "Kauri Street", "Photos and time checked", "Invoice ready"],
  ["Payment follow-up", "Riverside Body Corp", "7 days overdue", "Reminder ready"],
];

const ownerQuestions = [
  ["What needs me?", "Only decisions, corrections and exceptions reach the owner."],
  ["What did Churvox prepare?", "Quotes, invoices, replies, reminders and job changes are ready to review."],
  ["What is happening today?", "Jobs, workers, delays and money needing attention are visible together."],
  ["What happened without chasing?", "Acknowledgements, completed work, viewed invoices and replies stay recorded."],
];

const flow = [
  ["01", "Client asks", "A request, booking, change or question enters the business."],
  ["02", "Churvox prepares", "The client, job, worker, price and history are brought together."],
  ["03", "Worker does the job", "Acknowledgement, progress, time, notes and proof update the record."],
  ["04", "Owner approves", "Only the quote, reply, variation or invoice needing a decision comes back."],
];

const controls = [
  ["Nothing sends without approval", "Client emails, worker messages and reminders stay editable until you approve."],
  ["Nothing charges or pays automatically", "Churvox does not move money, create payouts or charge clients by itself."],
  ["No tax filing behind your back", "Accounting preparation and exports remain owner-controlled."],
  ["Your records stay yours", "Business records remain separated, exportable and removable."],
];

export default function ExecutiveHomePage() {
  return (
    <main className="srhSite" data-version="CHURVOX_RENDER_SITES_MIGRATION_20260724">
      <PublicNav />

      <section className="srhHero">
        <div className="srhHeroCopy">
          <span className="srhKicker">Owner-approved job admin for service businesses</span>
          <h1>Run the job, <em>not the admin.</em></h1>
          <p>
            Churvox prepares the jobs, messages, quotes, invoices and follow-ups.
            You check what matters and approve before anything real moves.
          </p>
          <div className="srhActions">
            <Link className="srhPrimary" to="/signup?plan=operator">Start 14-day trial</Link>
            <Link className="srhSecondary" to="/demo">See Churvox in action</Link>
          </div>
          <div className="srhTrust">
            <span>No card upfront</span>
            <span>Nothing auto-sends</span>
            <span>Owner approval stays in control</span>
          </div>
        </div>

        <aside className="srhWorkspace" aria-label="Example Churvox workspace">
          <header>
            <div><small>Churvox workspace</small><strong>Needs you</strong></div>
            <b>4</b>
          </header>
          <nav aria-label="Workspace example tabs">
            <span className="active">Needs you</span><span>Today</span><span>Prepared</span><span>Done</span>
          </nav>
          <div className="srhApprovalList">
            {approvals.map(([type, client, detail, value], index) => (
              <article key={client} className={index === 0 ? "selected" : ""}>
                <i>{index + 1}</i>
                <div><small>{type}</small><strong>{client}</strong><span>{detail}</span></div>
                <b>{value}</b>
              </article>
            ))}
          </div>
          <footer><span>Churvox prepared the admin.</span><strong>You make the decision.</strong></footer>
        </aside>
      </section>

      <section className="srhSection srhQuestions">
        <div className="srhSectionHead">
          <span>The owner view</span>
          <h2>Four questions. No dashboard hunting.</h2>
          <p>Churvox is organised around what an owner needs to know—not around software modules that need managing.</p>
        </div>
        <div className="srhQuestionGrid">
          {ownerQuestions.map(([title, text], index) => (
            <article key={title}><b>0{index + 1}</b><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="srhSection srhDark">
        <div className="srhSectionHead">
          <span>A working day</span>
          <h2>See the work arrive. See Churvox prepare it. Approve what matters.</h2>
        </div>
        <div className="srhFlow">
          {flow.map(([number, title, text]) => (
            <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="srhSection srhControl">
        <div className="srhSectionHead">
          <span>Owner control is the product</span>
          <h2>Prepared does not mean automatic.</h2>
          <p>Communication, money, accounting and access stay owner-controlled.</p>
        </div>
        <div className="srhControlGrid">
          {controls.map(([title, text]) => (
            <article key={title}><b>✓</b><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="srhClosing">
        <div><span>14-day trial · no card upfront</span><h2>Churvox does the admin. You approve.</h2></div>
        <div><Link className="srhPrimary" to="/signup?plan=operator">Start free trial</Link><Link className="srhSecondary light" to="/pricing">View pricing</Link></div>
      </section>

      <PublicFooter />
    </main>
  );
}
