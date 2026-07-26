import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getIndustryBySlug, professions } from "./PublicProfessionSections";
import { PublicNav, PublicFooter, coreAreas } from "./ChurvoxPublicShell";

const HOME_TITLE = "Churvox — Owner-controlled job admin for service businesses";
const HOME_DESCRIPTION = "Churvox prepares jobs, worker updates, messages, quotes, invoices and follow-ups for the service-business owner to review and approve.";

function setMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function setCanonical(href) {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

export default function IndustryPage() {
  const { slug } = useParams();
  const industry = getIndustryBySlug(slug);

  React.useEffect(() => {
    if (!industry || typeof document === "undefined") return undefined;
    const canonical = `https://www.churvox.com/industries/${encodeURIComponent(slug)}`;
    const title = `${industry.title} job management software | Churvox`;
    const description = `${industry.intro} Churvox keeps important communication and money steps under owner approval.`;
    document.title = title;
    setCanonical(canonical);
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    return () => {
      document.title = HOME_TITLE;
      setCanonical("https://www.churvox.com/");
      setMeta("name", "description", HOME_DESCRIPTION);
    };
  }, [industry, slug]);

  if (!industry) return <Navigate to="/product" replace />;

  return (
    <main className="cp26Site cpWorld cpWorldIndustry" data-room="industry" data-version="CHURVOX_PUBLIC_WORLD_INDUSTRY_20260724">
      <PublicNav active="/product" />
      <section className="cpWorldHero">
        <div className="cpWorldLead">
          <span className="cpWorldRouteCode">Industry · {industry.short}</span>
          <h1>{industry.headline}</h1>
          <p>{industry.intro} The examples and wording match the work, while jobs, clients, workers and money remain connected.</p>
          <div className="cpWorldActions">
            <Link className="cp26Button" to={`/demo?industry=${encodeURIComponent(slug)}`}>View {industry.short} demo</Link>
            <Link className="cp26Button cp26ButtonGhost" to={`/signup?industry=${encodeURIComponent(slug)}`}>Start 14-day trial</Link>
          </div>
          <div className="cpWorldFacts"><span>Connected Churvox workflow</span><span>{industry.title} examples</span><span>Owner approval</span></div>
        </div>
        <aside className="cpIndustryBoard">
          <header><small>Example workflow</small><b>{industry.short}</b></header>
          <div className="cpIndustryRoute">{industry.flow.map((item, index) => <article key={item}><i>{String(index + 1).padStart(2, "0")}</i><b>{item}</b><span>{index === industry.flow.length - 1 ? "Owner review" : "Next step"}</span></article>)}</div>
          <div className="cpIndustryExamples">{industry.examples.slice(0, 5).map((item) => <span key={item}>{item}</span>)}</div>
        </aside>
      </section>

      <section className="cpWorldSection">
        <header className="cpWorldSectionHead">
          <span>Built for the work</span>
          <h2>The wording changes. The workflow stays connected.</h2>
          <p>Each part of Churvox has a clear job, so owners can find work, people, messages and money without decoding a complicated system.</p>
        </header>
        <div className="cpIndustryCore">{coreAreas.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div>
      </section>

      <section className="cpWorldSection cpRecordRiver">
        <header className="cpWorldSectionHead">
          <span>What stays controlled</span>
          <h2>From request to payment without losing the trail.</h2>
          <p>Jobs, client information, worker updates, proof and money remain connected. Important external actions return to Command for owner approval.</p>
        </header>
        <div className="cpRecordTrack">{["Request captured", "Job prepared", "Worker updated", "Proof checked", "Owner approved"].map((item, index) => <article key={item}><b>0{index + 1}</b><h3>{item}</h3><p>{index === 4 ? "The owner approves, edits, parks or asks for the missing information." : "The same record moves forward without being entered again."}</p></article>)}</div>
      </section>

      <section className="cpWorldSection">
        <header className="cpWorldSectionHead"><span>Other industries</span><h2>Choose the closest fit for your business.</h2><p>These are product examples, not customer endorsements or claims about who uses Churvox.</p></header>
        <div className="cpIndustryDirectory">{professions.map(([title, , industrySlug], index) => <Link key={industrySlug} to={`/industries/${industrySlug}`} aria-current={industrySlug === slug ? "page" : undefined}><span>Industry {String(index + 1).padStart(2, "0")}</span>{title}{industrySlug === slug ? " · Current" : ""}</Link>)}</div>
      </section>

      <section className="cpWorldClosing">
        <div><span>{industry.title}</span><h2>Try Churvox with your own work.</h2><p>The demo uses clearly labelled example information. A trial account starts empty and contains only the records you add.</p></div>
        <div><Link className="cp26Button" to={`/demo?industry=${encodeURIComponent(slug)}`}>Open demo</Link><Link className="cp26Button cp26ButtonGhost" to={`/signup?industry=${encodeURIComponent(slug)}`}>Start free trial</Link></div>
      </section>
      <PublicFooter />
    </main>
  );
}
