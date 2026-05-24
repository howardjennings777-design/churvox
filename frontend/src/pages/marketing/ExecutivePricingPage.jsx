import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutivePublicSite.css";

const plans=[["Start","$39","Owner-operator","Jobs, clients, quotes and invoices in one calm base."],["Crew","$89","Small team","Field updates, proof and crew workflow in one organised system."],["Operator","$149","Recommended","AI-prepared admin and owner approval."],["Command","$299","Full control","MYOB, payroll, roles and higher limits."]];
export default function ExecutivePricingPage(){return <main className="ex-site"><Nav/><section className="ex-page-hero"><p className="ex-kicker">Pricing</p><h1>Choose the operating level that fits your business.</h1><p>Start with core workflow, add crew control, or move into Operator where Churvox prepares admin actions for owner approval.</p></section><section className="ex-plans">{plans.map(([name,price,label,text])=><article key={name} className={name==="Operator"?"is-featured":""}><span>{label}</span><h2>{name}</h2><strong>{price}<em>/month + GST</em></strong><p>{text}</p><Link to="/signup" className={name==="Operator"?"ex-btn ex-btn--primary":"ex-btn ex-btn--dark"}>Choose {name}</Link></article>)}</section><Footer/></main>}
