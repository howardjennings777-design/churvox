import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutivePublicSite.css";
import "./ExecutivePublicExtras.css";

const plans=[
  {name:"Start",price:"$39",tag:"Owner-operator",summary:"For a solo trade owner who wants job, client and invoice admin kept clear.",features:["Jobs, clients, quotes and invoices","Simple approval desk","Work and invoice actions surfaced","Basic owner workflow","No MYOB sync"]},
  {name:"Crew",price:"$89",tag:"Small team",summary:"For a growing crew that needs worker assignment, job proof and admin in one flow.",features:["Everything in Start","Team and worker workflow","Worker assignment lane","Job proof and notes","More jobs and client capacity"]},
  {name:"Operator",price:"$149",tag:"Most popular",summary:"For owners who want Churvox to prepare admin so they only approve what matters.",features:["Everything in Crew","AI-prepared approval lanes","Draft invoices and message follow-ups","Work Slip review flow","MYOB add-on available"]},
  {name:"Command",price:"$299",tag:"Full command",summary:"For larger operators that want roles, payroll workspace and accounting sync included.",features:["Everything in Operator","MYOB sync included","Payroll workspace","Advanced roles and permissions","Up to 50 active team members"]}
];
const addons=[
  ["Command Growth Pack","$99/month + GST","Adds 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity."],
  ["MYOB add-on for Operator","$39/month + GST","Optional on Operator. Included by default on Command."],
  ["SMS credits","Separate packs","Buy credits when you need customer reminders, job updates and payment follow-ups."]
];
const comparisons=["Approve work from one lane.","Approve invoices and money actions clearly.","Assign workers without hunting through jobs.","Review drafted customer messages before sending."];

export default function ExecutivePricingPage(){return <main className="ex-site ex-pricing-site" data-version="CHURVOX_PUBLIC_PRICING_APPROVAL_20260527"><Nav/><section className="ex-page-hero ex-pricing-hero"><p className="ex-kicker">Pricing</p><h1>Choose how much admin Churvox should prepare for approval.</h1><p>Start with core job control, move into crew workflow, or choose Operator where Churvox prepares the daily admin and the owner approves the next step from clear lanes.</p></section><section className="ex-plans ex-pricing-plans">{plans.map((plan)=><article key={plan.name} className={plan.name==="Operator"?"is-featured":""}><span>{plan.tag}</span><h2>{plan.name}</h2><strong>{plan.price}<em>/month + GST</em></strong><p>{plan.summary}</p><ul>{plan.features.map((feature)=><li key={feature}>{feature}</li>)}</ul><Link to="/signup" className={plan.name==="Operator"?"ex-btn ex-btn--primary":"ex-btn ex-btn--dark"}>{plan.name==="Operator"?"Choose Operator":"Choose "+plan.name}</Link></article>)}</section><section className="ex-pricing-band"><div><p className="ex-kicker">What makes it different</p><h2>Churvox does the admin. You approve.</h2></div><div className="ex-pricing-checks">{comparisons.map((item)=><span key={item}>{item}</span>)}</div></section><section className="ex-addons"><div><p className="ex-kicker">Add-ons and scale</p><h2>Grow without changing systems.</h2><p>Command includes the bigger operating setup. Operator can add MYOB when the business is ready. SMS stays as credits so you only buy what you use.</p></div><div className="ex-addon-grid">{addons.map(([name,price,text])=><article key={name}><span>{name}</span><b>{price}</b><p>{text}</p></article>)}</div></section><Footer/></main>}
