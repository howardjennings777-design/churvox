import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getIndustryBySlug, professions } from "./PublicProfessionSections";
import { PublicNav, PublicFooter, Eyebrow, SectionHeading, coreAreas } from "./ChurvoxPublicShell";

export default function IndustryPage() {
  const { slug } = useParams();
  const industry = getIndustryBySlug(slug);
  if (!industry) return <Navigate to="/product" replace />;

  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_INDUSTRY_20260710">
      <PublicNav active="/product" />

      <section className="cp26Hero cp26HeroCompact">
        <div className="cp26HeroCopy">
          <Eyebrow>{industry.title} workflow</Eyebrow>
          <h1>{industry.headline}</h1>
          <p>{industry.intro}</p>
          <div className="cp26HeroActions">
            <Link className="cp26Button" to={`/demo?industry=${encodeURIComponent(slug)}`}>Open labelled demo</Link>
            <Link className="cp26Button cp26ButtonGhost" to={`/signup?industry=${encodeURIComponent(slug)}`}>Start 14-day trial</Link>
          </div>
          <div className="cp26TrustRail">
            <span>Same Churvox engine</span>
            <span>Industry wording and examples</span>
            <span>Owner approval stays in control</span>
          </div>
        </div>

        <aside className="cp26CommandPreview" aria-label={`${industry.title} workflow summary`}>
          <div className="cp26PreviewTop">
            <div><small>Workflow fit · examples only</small><strong>{industry.short}</strong></div>
            <span>{industry.flow.length} clear stages</span>
          </div>
          <div className="cp26PreviewBody">
            <section className="cp26PreviewQueue">
              <small>Typical example records</small>
              {industry.examples.slice(0, 5).map((item, index) => (
                <article key={item} className={index === 0 ? "selected" : ""}>
                  <div><b>{item}</b><span>{industry.title}</span></div>
                  <em>Example</em>
                </article>
              ))}
            </section>
            <section className="cp26PreviewSlip">
              <small>What stays consistent</small>
              <h3>Owner-controlled admin</h3>
              <p>Jobs, client details, worker updates, proof and money records stay connected. Important decisions return to Command for review.</p>
            </section>
          </div>
        </aside>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="How it flows"
          title="From work request to owner-approved admin."
          text="These stages describe the product workflow, not a promise that anything is sent or completed automatically."
        />
        <div className="cp26FlowGrid">
          {industry.flow.map((item) => <article key={item}><b>{item}</b></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="The operating system"
          title="Industry wording changes. The control model does not."
          text="Each page still has one clear responsibility, and Command remains the approval desk."
        />
        <div className="cp26AreaGrid">
          {coreAreas.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Other service businesses"
          title="Choose the closest operating fit."
          text="These are configuration examples, not customer endorsements or usage claims."
        />
        <div className="cp26IndustryGrid">
          {professions.map(([title, , industrySlug]) => (
            <Link key={industrySlug} to={`/industries/${industrySlug}`} aria-current={industrySlug === slug ? "page" : undefined}>
              <span>{title}{industrySlug === slug ? " · Current" : ""}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>{industry.title}</Eyebrow>
          <h2>Use the labelled demo, then test Churvox with your own records.</h2>
          <p>Demo names, amounts and jobs are examples. Trial data belongs to the business account that enters it.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to={`/demo?industry=${encodeURIComponent(slug)}`}>Open demo</Link>
          <Link className="cp26Button cp26ButtonGhost" to={`/signup?industry=${encodeURIComponent(slug)}`}>Start free trial</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
