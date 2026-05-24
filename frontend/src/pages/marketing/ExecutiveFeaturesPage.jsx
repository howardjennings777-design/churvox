import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutivePublicSite.css";

const core=[
  ["AI Action Queue","Churvox surfaces the next best actions: draft invoices, payment reminders, unassigned jobs, missing client details and quote follow-ups."],
  ["Live Crew","See who is on job now, what they are working on, and where attention is needed without digging through every page."],
  ["Money Desk","Ready-to-bill work, owing invoices, overdue payments and draft invoices stay visible beside the daily workflow."],
  ["Dispatch / Today","Keep today’s work, unassigned jobs and crew movement in one operating view."],
  ["Jobs + Clients","Jobs, client details, notes and proof stay connected so the business record does not scatter."],
  ["Quotes + Invoices","Move from quote to job to invoice without retyping the same business information."],
];
const advanced=[
  ["MYOB Sync","Operator can add MYOB. Command includes it by default for invoice and payment sync workflows."],
  ["Payroll Workspace","Command gives payroll/admin users a focused place for approved hours, worker summaries and payroll handoff."],
  ["Automation Engine","Rules and AI-prepared actions help owners reduce repeated admin without losing approval control."],
  ["Roles + Permissions","Owner, Manager, Worker, Office Admin and Payroll access stay separated so each person sees what they need."],
];
const flow=["Work comes in","Churvox prepares admin","Owner reviews","Crew moves","Money gets billed"];

export default function ExecutiveFeaturesPage(){return <main className="ex-site ex-features-site" data-version="CHURVOX_PUBLIC_FEATURES_COMMAND_20260524"><Nav/><section className="ex-page-hero"><p className="ex-kicker">Features with purpose</p><h1>A complete operating flow, not a pile of screens.</h1><p>Churvox connects jobs, crew, proof, quotes, invoices and approvals so the owner can run the business from one command floor.</p><div className="ex-actions"><Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link><Link to="/pricing" className="ex-btn ex-btn--quiet">View pricing</Link></div></section><section className="ex-pricing-band"><div><p className="ex-kicker">The Churvox flow</p><h2>Work goes in. Admin gets prepared. You approve.</h2></div><div className="ex-pricing-checks">{flow.map((step)=><span key={step}>{step}</span>)}</div></section><section className="ex-grid ex-feature-grid">{core.map(([title,text])=><article key={title}><p className="ex-kicker">Core control</p><h2>{title}</h2><span>{text}</span></article>)}</section><section className="ex-addons"><div><p className="ex-kicker">Power features</p><h2>Built for businesses that want to grow into a stronger operating system.</h2><p>Keep the simple command floor as the centre, then add accounting, payroll, automation and role control as the business gets bigger.</p></div><div className="ex-addon-grid">{advanced.map(([title,text])=><article key={title}><span>{title}</span><b>Command ready</b><p>{text}</p></article>)}</div></section><Footer/></main>}
