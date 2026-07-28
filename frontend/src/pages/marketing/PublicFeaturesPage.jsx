import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";
import "./PublicFeaturesPage.css";

const FEATURE_GROUPS = [
  {
    code: "01",
    area: "Capture",
    title: "Start with the right client and job facts.",
    text: "Keep the request, contact details, address, access notes, scope, timing and price basis attached to one record from the start.",
    points: ["Client history", "Job notes and scope", "One-off or recurring work"],
  },
  {
    code: "02",
    area: "Plan",
    title: "Turn the request into work someone can actually do.",
    text: "Set the date, worker, instructions and repeat pattern without rebuilding the same information in another system.",
    points: ["Schedule and assignment", "Recurring jobs", "Worker-ready instructions"],
  },
  {
    code: "03",
    area: "Field",
    title: "Give workers a focused job view.",
    text: "Workers can acknowledge, start, update and complete the job while returning useful time, notes, checklists and photos.",
    points: ["Acknowledge and progress", "Time and notes", "Completion proof"],
  },
  {
    code: "04",
    area: "Money",
    title: "Keep the quote, completed work and invoice connected.",
    text: "Accepted scope, extras, job proof and pricing stay visible when the next quote or invoice decision is prepared.",
    points: ["Quotes connected to jobs", "Editable invoice drafts", "Viewed, paid and overdue status"],
  },
  {
    code: "05",
    area: "Command",
    title: "Bring only real decisions back to the owner.",
    text: "Messages, money steps, exceptions and missing information wait with the reason and the affected records visible.",
    points: ["Approve or edit", "Park without losing history", "Ask for missing information"],
  },
  {
    code: "06",
    area: "Handoff",
    title: "Move approved records to the next business step.",
    text: "Exports and owner-controlled accounting handoff help keep the operational record aligned without silent sends or filings.",
    points: ["CSV and record exports", "Owner-controlled sync", "Clear audit history"],
  },
];

function FeatureBoard() {
  return <aside className="cpfBoard" aria-label="Churvox feature flow example">
    <header><div><small>Connected workday</small><b>Feature board</b></div><span>Owner control on</span></header>
    <div className="cpfBoardRows">
      {FEATURE_GROUPS.map((feature, index) => <article key={feature.code} className={index === 4 ? "owner" : ""}>
        <i>{feature.code}</i><div><small>{feature.area}</small><b>{feature.points[0]}</b></div><span>{index === 4 ? "Review" : index < 3 ? "Connected" : "Prepared"}</span>
      </article>)}
    </div>
    <footer><span>Nothing important happens silently.</span><b>Churvox prepares. The owner decides.</b></footer>
  </aside>;
}

function setMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

export default function PublicFeaturesPage() {
  React.useEffect(() => {
    const title = "Churvox features | Jobs, workers, quotes, invoices and owner approval";
    const description = "Explore the Churvox workflow for clients, jobs, recurring work, workers, proof, quotes, invoices, exports and owner approval.";
    document.title = title;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://www.churvox.com/features/");
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", "https://www.churvox.com/features/");
  }, []);

  return <main className="cp26Site cpWorld cpfSite" data-room="features" data-version="CHURVOX_DISTINCT_FEATURES_20260728">
    <PublicNav active="/features/" />

    <section className="cpfHero">
      <div className="cpfHeroCopy">
        <span className="cpfKicker">Churvox features</span>
        <h1>What Churvox actually does, <em>step by step.</em></h1>
        <p>Each feature has one practical job: keep the work connected, prepare the next useful admin step and return important decisions to the owner.</p>
        <div className="cpfActions"><Link className="cp26Button" to="/demo/">Run the guided demo</Link><Link className="cp26Button cp26ButtonGhost" to="/signup/?plan=operator">Start 14-day trial</Link></div>
        <div className="cpfFacts"><span>Real job records</span><span>Focused worker view</span><span>Owner approval</span></div>
      </div>
      <FeatureBoard />
    </section>

    <section className="cpfFlow" aria-label="Churvox connected feature flow">
      <header><small>One connected flow</small><h2>Six jobs the system should handle cleanly.</h2><p>The pages are different because the work is different. The client, job, worker and money records remain connected underneath.</p></header>
      <div className="cpfFlowRail">{FEATURE_GROUPS.map((feature) => <a key={feature.code} href={`#feature-${feature.code}`}><i>{feature.code}</i><b>{feature.area}</b><span>{feature.title}</span></a>)}</div>
    </section>

    <section className="cpfFeatureStage">
      {FEATURE_GROUPS.map((feature, index) => <article id={`feature-${feature.code}`} className={`cpfFeature ${index % 2 ? "reverse" : ""}`} key={feature.code}>
        <div className="cpfFeatureNumber"><span>{feature.code}</span><small>{feature.area}</small></div>
        <div className="cpfFeatureCopy"><h2>{feature.title}</h2><p>{feature.text}</p></div>
        <ul>{feature.points.map((point) => <li key={point}><span>✓</span>{point}</li>)}</ul>
      </article>)}
    </section>

    <section className="cpfOwnerBand">
      <div><small>Owner guardrail</small><h2>Useful automation should still show its work.</h2><p>Churvox keeps the source records, missing facts and next effect visible before an important action is approved.</p></div>
      <div className="cpfDecision"><header><span>Example decision</span><b>Invoice draft ready</b></header><dl><div><dt>Checked</dt><dd>Job, price, time and proof</dd></div><div><dt>Still needed</dt><dd>Confirm one extra-work amount</dd></div><div><dt>Owner options</dt><dd>Approve · Edit · Park · Ask</dd></div></dl><p>Example only. Nothing is sent, charged or synced from this page.</p></div>
    </section>

    <section className="cpfClose"><div><small>See the workflow, not a feature dump</small><h2>Follow one job through the real sequence.</h2><p>The demo shows how these features work together from request to owner-approved invoice.</p></div><div><Link className="cp26Button" to="/demo/">Open demo</Link><Link className="cp26Button cp26ButtonGhost" to="/pricing/">View pricing</Link></div></section>
    <PublicFooter />
  </main>;
}
