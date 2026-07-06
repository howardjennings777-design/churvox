import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";
import "./PublicDemoPage.css";

const commandQueue = [
  ["Invoice draft", "Belmont Villas hedge trim", "$340", "Approve"],
  ["Worker issue", "Gate locked at Northwood", "Check", "Edit"],
  ["Quote follow-up", "Garden tidy quote viewed", "$780", "Park"],
];

const jobs = [
  ["8:30", "Lawn mow", "Northwood", "Cam", "$95", "Weekly"],
  ["10:15", "Hedge trim", "Belmont Villas", "Jess", "$340", "One-off"],
  ["1:00", "Gutter clean", "Hillcrest", "Lee", "$180", "Fortnightly"],
];

const workers = [
  ["Cam", "In progress", "Belmont Villas", "GPS on"],
  ["Jess", "Finishing", "Northwood", "Photos sent"],
  ["Lee", "Not started", "Hillcrest", "Queued"],
];

function Panel({ title, eyebrow, children, className = "" }) {
  return <section className={`demoPanel ${className}`}><header>{eyebrow ? <small>{eyebrow}</small> : null}<h3>{title}</h3></header>{children}</section>;
}

export default function PublicDemoPage() {
  return (
    <main className="publicSite publicDemoSite cv2Site publicPageSlim" data-version="CHURVOX_DEMO_SLIM_20260706">
      <Nav />

      <section className="publicHero publicDemoHero slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Demo</span>
          <h1>Preview Churvox without logging in.</h1>
          <p>This page uses fake demo records only. It shows the owner workflow without exposing real client data.</p>
          <div className="publicActions">
            <a href="#command-demo" className="publicPrimary">View Command</a>
            <Link to="/signup" className="publicSecondary">Start trial</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel publicDemoHeroCard slimPanel">
          <small>Core promise</small>
          <b>Churvox does the admin. You approve.</b>
          <span>Work comes in, Churvox prepares the next step, and decisions wait in Command.</span>
        </aside>
      </section>

      <section className="demoAppShell slimDemoShell" aria-label="Churvox public demo app preview">
        <header className="demoTopBar">
          <div><small>Owner command floor</small><h2>Churvox Demo Co.</h2></div>
          <nav aria-label="Demo sections"><a href="#today-demo">Today</a><a href="#command-demo">Command</a><a href="#jobs-demo">Jobs</a><a href="#workers-demo">Workers</a></nav>
        </header>

        <section id="today-demo" className="demoHeroStrip compactDemoHero">
          <div><small>Today</small><h2>One view for the day.</h2><p>Jobs, workers, money and checks sit together so the next step is obvious.</p></div>
          <div className="demoStats"><span className="demoStat"><b>3</b><small>jobs</small></span><span className="demoStat blue"><b>3</b><small>workers</small></span><span className="demoStat red"><b>3</b><small>checks</small></span><span className="demoStat orange"><b>$615</b><small>drafts</small></span></div>
        </section>

        <section className="demoGrid">
          <Panel title="Today run sheet" eyebrow="Work moving" className="span7">
            <div className="demoList">{jobs.map(([time, title, client, worker, price, repeat]) => <article className="demoRow" key={time + title}><div><b>{time} · {title}</b><span>{client} · {worker} · {repeat}</span></div><em>{price}</em></article>)}</div>
          </Panel>
          <Panel title="Waiting for owner" eyebrow="Command" className="span5 dark" id="command-demo">
            <div className="demoList compact">{commandQueue.map(([type, title, amount, action]) => <article className="demoRow hot" key={title}><div><b>{type}</b><span>{title} · {amount}</span></div><em>{action}</em></article>)}</div>
          </Panel>
        </section>

        <section id="jobs-demo" className="demoGrid">
          <Panel title="Job form" eyebrow="Editable details" className="span6">
            <div className="demoFormPreview"><label><span>Client</span><b>Belmont Villas</b></label><label><span>Service</span><b>Hedge trim</b></label><label><span>Worker</span><b>Jess</b></label><label><span>Price</span><b>$340</b></label><label><span>Frequency</span><b>One-off</b></label></div>
          </Panel>
          <Panel title="Workers" eyebrow="Field view" className="span6" id="workers-demo">
            <div className="demoList">{workers.map(([name, status, job, tag]) => <article className="demoRow cool" key={name}><div><b>{name}</b><span>{status} · {job}</span></div><em>{tag}</em></article>)}</div>
          </Panel>
        </section>
      </section>

      <section className="publicBand publicCta publicDemoCta slimCta">
        <div><span className="publicKicker">Next step</span><h2>Try it with your own business.</h2></div>
        <div className="publicActions"><Link to="/signup" className="publicPrimary">Start trial</Link><Link to="/pricing" className="publicSecondary">View pricing</Link></div>
      </section>

      <Footer />
    </main>
  );
}
