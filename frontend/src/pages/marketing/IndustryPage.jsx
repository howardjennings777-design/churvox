import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import { BusinessCoverageSection, ProductScreensSection, getIndustryBySlug, professions } from "./PublicProfessionSections";
import "./SimplePublic.css";
import "./PublicProfessionSections.css";

export default function IndustryPage() {
  const { slug } = useParams();
  const industry = getIndustryBySlug(slug);
  if (!industry) return <Navigate to="/product" replace />;

  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_INDUSTRY_PAGE_20260708">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Industry fit</span>
          <h1>{industry.headline}</h1>
          <p>{industry.intro}</p>
          <div className="publicActions">
            <Link to={`/demo?industry=${encodeURIComponent(slug)}`} className="publicPrimary">See this demo flow</Link>
            <Link to={`/signup?industry=${encodeURIComponent(slug)}`} className="publicSecondary">Start trial</Link>
          </div>
          <div className="industryFitGrid">
            {industry.examples.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>{industry.title}</small>
          <b>Same Churvox engine. Trade-specific wording.</b>
          <span>Jobs, clients, workers, proof, money and Command stay connected without creating a separate messy product for every profession.</span>
        </aside>
      </section>

      <section className="publicProfessionBand compact">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">How it flows</span>
          <h2>From work request to owner-approved admin.</h2>
        </div>
        <div className="industryFlowGrid">
          {industry.flow.map((item, index) => (
            <article key={item}>
              <i>{index + 1}</i>
              <b>{item}</b>
            </article>
          ))}
        </div>
      </section>

      <BusinessCoverageSection />
      <ProductScreensSection />

      <section className="publicProfessionBand compact">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Other service businesses</span>
          <h2>Churvox stays broad without getting vague.</h2>
        </div>
        <div className="publicProfessionGrid">
          {professions.map(([title, text, industrySlug]) => (
            <Link to={`/industries/${industrySlug}`} className="publicProfessionCard" key={industrySlug}>
              <b>{title}</b>
              <span>{text}</span>
              <em>{industrySlug === slug ? "Current" : "View fit"}</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="cv2FinalCta slimCta">
        <span>{industry.title}</span>
        <h2>Try Churvox with your own jobs, workers and customers.</h2>
        <div className="publicActions cv2HeroActions">
          <Link to={`/demo?industry=${encodeURIComponent(slug)}`} className="publicPrimary">See demo flow</Link>
          <Link to={`/signup?industry=${encodeURIComponent(slug)}`} className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
