import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutivePublicSite.css";

function Nav(){return <header className="ex-nav"><Link to="/" className="ex-brand"><ChurvoxLogo/><span>Churvox</span></Link><nav className="ex-nav-links"><Link to="/">Home</Link><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link></nav><div className="ex-nav-actions"><Link to="/login" className="ex-login">Log in</Link><Link to="/signup" className="ex-btn ex-btn--dark">Start free</Link></div></header>}
function Footer(){return <footer className="ex-footer"><div><Link to="/" className="ex-brand ex-brand--footer"><ChurvoxLogo/><span>Churvox</span></Link><p>AI operating software for trade and service businesses.</p></div><div className="ex-footer-links"><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/login">Log in</Link><Link to="/signup">Start free</Link></div></footer>}

export { Nav, Footer };

export default function ExecutiveHomePage(){return <main className="ex-site"><Nav/><section className="ex-hero"><div><p className="ex-kicker">AI operating desk for trade businesses</p><h1>Run the office with calm control.</h1><p className="ex-lead">Churvox brings jobs, crew updates, quotes, invoices and follow-ups into one refined operating desk. The AI prepares the admin. The owner reviews and approves.</p><div className="ex-actions"><Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link><Link to="/features" className="ex-btn ex-btn--quiet">Explore Churvox</Link></div></div><aside className="ex-preview"><p>Owner approval queue</p><h2>Prepared work, waiting for your decision.</h2><span>Nothing important is sent, billed or changed until the owner approves.</span></aside></section><section className="ex-statement"><p>Churvox is not another busy dashboard. It is a control room for the daily work that keeps a trade business moving.</p></section><Footer/></main>}
