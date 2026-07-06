import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";
import "./PublicDemoPage.css";

const commandQueue = [
  ["Invoice ready", "Belmont Villas hedge trim", "$340", "Approve"],
  ["Gate issue", "Northwood access problem", "Check", "Edit"],
  ["Quote viewed", "Garden tidy follow-up", "$780", "Park"],
];

const jobs = [
  ["8:30", "Lawn mow", "Northwood", "Cam", "$95", "Weekly"],
  ["10:15", "Hedge trim", "Belmont Villas", "Jess", "$340", "One-off"],
  ["1:00", "Gutter clean", "Hillcrest", "Lee", "$180", "Fortnightly"],
];

const workers = [
  ["Cam", "On site", "Belmont Villas", "GPS on"],
  ["Jess", "Finishing", "Northwood", "Photos sent"],
  ["Lee", "Next job", "Hillcrest", "Queued"],
];

function Panel({ title, eyebrow, children, className = "" }) {
  return <section className={`demoPanel ${className}`}><header>{eyebrow ? <small>{eyebrow}</small> : null}<h3>{title}</h3></header>{children}</section>;
}

export default function PublicDemoPage() {
  return (
    <main className="publicSite publicDemoSite cv2Site publicPageSlim" data-version="CHURVOX_DEMO_COPY_20260706">
      <Nav />

      <section className="publicHero publicDemoHero slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Demo</span>
          <h1>See the Churvox workflow without logging in.</h1>
          <p>This demo uses fake records. It shows how jobs, workers and owner approvals sit together before anything important moves.</p>
          <div className="publicActions">
            <a href="#command-demo" className="publicPrimary">Jump to Command</a>
            <Link to="/signup" className="publicSecondary">Start trial</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel publicDemoHeroCard slimPanel">
          <small>What to look for</small>
          <b>The owner is not chasing the admin.</b>
          <span>Churvox lines up the record, the next step and the decision.</span>
        </aside>
      </section>

      <section className="demoAppShell slimDemoShell" aria-label="Churvox public demo app preview">
        <header className="demoTopBar">
          <div><small>Demo business</small><h2>Command preview</h2></div>
          <nav aria-label="Demo sections"><a href="#today-demo">Today</a><a href="#command-demo">Command</a><a href="#jobs-demo">Jobs</a><a href="#workers-demo">Workers</a></nav>
        </header>

        <section id="today-demo" className="demoHeroStrip compactDemoHero">
          <div><small>Today</small><h2>The day is already sorted.</h2><p>Jobs, workers, owner checks and draft value are visible without hunting through tabs.</p></div>
          <div className="demoStats"><span className="demoStat"><b>3</b><small>jobs</small></span><span className="demoStat blue"><b>3</b><small>workers</small></span><span className="demoStat red"><b>3</b><small>checks</small></span><span className="demoStat orange"><b>$615</b><small>drafts</small></span></div>
        </section>

        <section className="demoGrid">
          <Panel title="Run sheet" eyebrow="Today" className="span7">
            <div className="demoList">{jobs.map(([time, title, client, worker, price, repeat]) => <article className="demoRow" key={time + title}><div><b>{time} · {title}</b><span>{client} · {worker} · {repeat}</span></div><em>{price}</em></article>)}</div>
          </Panel>
          <Panel title="Owner checks" eyebrow="Command" className="span5 dark" id="command-demo">
            <div className="demoList compact">{commandQueue.map(([type, title, amount, action]) => <article className="demoRow hot" key={title}><div><b>{type}</b><span>{title} · {amount}</span></div><em>{action}</em></article>)}</div>
          </Panel>
        </section>

        <section id="jobs-demo" className="demoGrid">
          <Panel title="Job record" eyebrow="Prepared admin" className="span6">
            <div className="demoFormPreview"><label><span>Client</span><b>Belmont Villas</b></label><label><span>Work</span><b>Hedge trim</b></label><label><span>Worker</span><b>Jess</b></label><label><span>Price</span><b>$340</b></label><label><span>Repeat</span><b>One-off</b></label></div>
          </Panel>
          <Panel title="Field updates" eyebrow="Workers" className="span6" id="workers-demo">
            <div className="demoList">{workers.map(([name, status, job, tag]) => <article className="demoRow cool" key={name}><div><b>{name}</b><span>{status} · {job}</span></div><em>{tag}</em></article>)}</div>
          </Panel>
        </section>
      </section>

      <section className="publicBand publicCta publicDemoCta slimCta">
        <div><span className="publicKicker">Your turn</span><h2>Try it with your own jobs and workers.</h2></div>
        <div className="publicActions"><Link to="/signup" className="publicPrimary">Start trial</Link><Link to="/pricing" className="publicSecondary">View pricing</Link></div>
      </section>

      <Footer />
    </main>
  );
}
