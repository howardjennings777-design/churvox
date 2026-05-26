import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutivePublicSite.css";
import "./ExecutivePublicExtras.css";

const core=[
  ["Approve Work","Finished jobs, worker notes, job evidence and value are surfaced so the owner can sign off without hunting through screens."],
  ["Approve Invoices","Approved work, draft invoices, owing invoices and invoice blockers stay in one money approval lane."],
  ["Assign Workers","Unassigned jobs and crew gaps are pulled forward so dispatch decisions are easy to make."],
  ["Approve Messages","Quote follow-ups, customer updates and invoice reminders are drafted first, then the owner approves before anything sends."],
  ["Fix Issues","Missing price, missing customer details, overdue money and blocked admin are separated into a clear issue lane."],
  ["Work Slips","Tap any lane or row to open the full approval slip with details, notes, evidence, message draft and next-step buttons."],
];
const advanced=[
  ["MYOB Sync","Operator can add MYOB. Command includes it by default for invoice and payment sync workflows."],
  ["Payroll Workspace","Command gives payroll/admin users a focused place for approved hours, worker summaries and payroll handoff."],
  ["Automation Engine","Rules and AI-prepared actions help owners reduce repeated admin without losing approval control."],
  ["Roles + Permissions","Owner, Manager, Worker, Office Admin and Payroll access stay separated so each person sees what they need."],
];
const flow=["Work comes in","Churvox prepares admin","Owner opens the slip","Owner approves","Next step moves"];

export default function ExecutiveFeaturesPage(){return <main className="ex-site ex-features-site" data-version="CHURVOX_PUBLIC_FEATURES_APPROVAL_20260527"><Nav/><section className="ex-page-hero"><p className="ex-kicker">Features with purpose</p><h1>The approval desk for trade and service owners.</h1><p>Churvox connects jobs, workers, proof, quotes, invoices and customer messages into one approval flow. The owner starts with the next decision, not another pile of screens.</p><div className="ex-actions"><Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link><Link to="/pricing" className="ex-btn ex-btn--quiet">View pricing</Link></div></section><section className="ex-pricing-band"><div><p className="ex-kicker">The Churvox flow</p><h2>Work goes in. Admin gets prepared. You approve.</h2></div><div className="ex-pricing-checks">{flow.map((step)=><span key={step}>{step}</span>)}</div></section><section className="ex-grid ex-feature-grid">{core.map(([title,text])=><article key={title}><p className="ex-kicker">Approval lane</p><h2>{title}</h2><span>{text}</span></article>)}</section><section className="ex-addons"><div><p className="ex-kicker">Power features</p><h2>Built for businesses that want to grow into a stronger operating system.</h2><p>Keep the approval desk as the centre, then add accounting, payroll, automation and role control as the business gets bigger.</p></div><div className="ex-addon-grid">{advanced.map(([title,text])=><article key={title}><span>{title}</span><b>Command ready</b><p>{text}</p></article>)}</div></section><Footer/></main>}
