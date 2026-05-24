import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutivePublicSite.css";

export default function ExecutiveFeaturesPage(){const items=["Jobs","AI preparation","Money desk","Team roles"];return <main className="ex-site"><Nav/><section className="ex-page-hero"><p className="ex-kicker">Features with purpose</p><h1>A complete operating flow, not a pile of screens.</h1><p>Churvox connects jobs, crew, proof, quotes, invoices and approvals so the owner can run the business from one calm desk.</p><div className="ex-actions"><Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link><Link to="/pricing" className="ex-btn ex-btn--quiet">View pricing</Link></div></section><section className="ex-grid">{items.map((item)=><article key={item}><p className="ex-kicker">Control</p><h2>{item}</h2><span>Every area exists to move work forward and reduce owner admin.</span></article>)}</section><Footer/></main>}
