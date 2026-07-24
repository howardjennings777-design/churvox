import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";
import "./ChurvoxLivingOfficeHome.css";

const DESKS = [
  ["Bookings", "Requests, timing and recurring work", "3 prepared"],
  ["Field", "Workers, progress and proof", "6 active"],
  ["Clients", "Promises and follow-ups", "2 watched"],
  ["Money", "Quotes, invoices and missed revenue", "$4.2k ready"],
  ["Quality", "Photos, extras and exceptions", "1 check"],
];

const MOMENTS = [
  ["A worker calls in sick", "Churvox checks every affected job, worker, promise and dollar before preparing a recovery pack."],
  ["A client asks to move", "Ripple Preview shows the schedule, travel, worker and invoice consequences before anything changes."],
  ["Extra work happens", "Missed Money compares time, notes, photos and invoices so completed work does not quietly disappear."],
  ["You promised to call", "Promise Guard keeps commitments attached to the right client and brings them back before they are forgotten."],
];

const FLOW = [
  ["01", "Something happens", "A request, update, problem, payment or promise enters the business."],
  ["02", "The office understands it", "Churvox connects the client, job, worker, timing, messages and money."],
  ["03", "The ripple is checked", "Everything affected is compared before a response is prepared."],
  ["04", "You approve the move", "Only the real decision reaches your desk. Nothing important happens behind your back."],
];

function OfficeVisual() {
  return <div className="clhOffice" aria-label="Illustration of the Churvox live office">
    <div className="clhOfficeTop"><span><i />Live office</span><b>Everything connected</b></div>
    <div className="clhFloor">
      <div className="clhBrain"><span /><small>Churvox</small><b>Office brain</b><p>Checks the whole business</p></div>
      {DESKS.map(([name, note, state], index) => <article key={name} className={`clhDesk desk-${index + 1}`}>
        <i /><small>{name} desk</small><b>{state}</b><p>{note}</p>
      </article>)}
      <article className="clhOwnerDesk"><small>Owner desk</small><b>3 decisions</b><p>Approve · Edit · Park</p><span>Nothing sends without you</span></article>
      <div className="clhPath path-a" /><div className="clhPath path-b" /><div className="clhPath path-c" />
    </div>
    <div className="clhOfficeBottom"><span>Churvox prepared the work.</span><b>You make the decision.</b></div>
  </div>;
}

export const Nav = PublicNav;
export const Footer = PublicFooter;

export default function ExecutiveHomePage() {
  return <main className="clhSite" data-version="CHURVOX_LIVING_OFFICE_HOME_20260724">
    <PublicNav />
    <section className="clhHero">
      <div className="clhHeroCopy">
        <span className="clhKicker"><i />The digital office that works behind you</span>
        <h1>Your business is moving.<br /><em>Churvox moves with it.</em></h1>
        <p>Jobs, workers, messages, promises, quotes, invoices and problems become one connected office. Churvox checks what changed, prepares the next move and brings only the real decision to you.</p>
        <div className="clhActions"><Link className="primary" to="/signup?plan=operator">Start 14-day trial</Link><Link className="secondary" to="/demo">Walk through the office</Link></div>
        <div className="clhTrust"><span>No card upfront</span><span>Nothing auto-sends</span><span>Owner approval stays in control</span></div>
      </div>
      <OfficeVisual />
    </section>
    <section className="clhStatement"><span>Not another dashboard</span><h2>Churvox does not wait for you to hunt through software.</h2><p>It watches the connected business, understands what one change affects and prepares the safest next move.</p></section>
    <section className="clhMoments"><header><span>The holy-shit moments</span><h2>One event. The whole office responds.</h2></header><div>{MOMENTS.map(([title, text], index) => <article key={title}><b>0{index + 1}</b><h3>{title}</h3><p>{text}</p><em>{index === 0 ? "Fix Today" : index === 1 ? "Ripple Preview" : index === 2 ? "Missed Money" : "Promise Guard"}</em></article>)}</div></section>
    <section className="clhMove"><div className="clhMoveCopy"><span>One best move</span><h2>Stop showing the owner twenty alerts.</h2><p>Churvox ranks what matters and explains the single most useful move right now.</p></div><article className="clhMoveCard"><small>Best move right now</small><h3>Approve the Riverside variation.</h3><p>It protects $680 of extra work, unblocks the worker and lets the invoice be prepared today.</p><div><span>Money protected</span><b>$680</b></div><div><span>Records affected</span><b>4</b></div><button type="button">See why this is first</button></article></section>
    <section className="clhFlow"><header><span>How the office thinks</span><h2>Something happens. Everything affected is checked.</h2></header><div>{FLOW.map(([number, title, text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="clhTell"><div><span>Tell Churvox</span><h2>Ask the whole office, not a blank chatbot.</h2><p>“Sam is sick tomorrow. Sort it out.” Churvox checks the live jobs, workers, client promises and money impact, then prepares one recovery pack for approval.</p></div><div className="clhTellPanel"><header><i />The office is listening</header><p>Sam is sick tomorrow. Sort it out.</p><section><small>Recovery pack prepared</small><b>4 jobs checked · 2 can move · 1 can be reassigned</b><span>Three client messages and the schedule changes are ready. Nothing has changed yet.</span></section><button type="button">Review prepared plan</button></div></section>
    <section className="clhControl"><div><span>Control is the product</span><h2>Prepared does not mean automatic.</h2></div><div className="clhControlGrid"><article><b>01</b><h3>Nothing sends</h3><p>Client and worker communication stays editable until the owner approves it.</p></article><article><b>02</b><h3>Nothing moves money</h3><p>No client charge, payout or accounting action happens silently.</p></article><article><b>03</b><h3>Nothing hides the reason</h3><p>Every warning and suggestion explains the records and consequences behind it.</p></article><article><b>04</b><h3>Everything leaves a trail</h3><p>Approvals, edits, changes and outcomes remain attached to the business story.</p></article></div></section>
    <section className="clhClose"><div><span>14-day trial · no card upfront</span><h2>Put a real office behind the business.</h2><p>Churvox prepares the work. You approve what matters.</p></div><div><Link className="primary" to="/signup?plan=operator">Start free trial</Link><Link className="secondary light" to="/pricing">View pricing</Link></div></section>
    <PublicFooter />
  </main>;
}
