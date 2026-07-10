import React from "react";
import { Link } from "react-router-dom";
import { getIndustry, industryOptions, normalizeIndustry } from "../../config/churvoxIndustrySystem";
import { PublicNav, PublicFooter, Eyebrow } from "./ChurvoxPublicShell";
import "./PublicDemoPage.css";

function queryIndustry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeIndustry(params.get("industry") || params.get("business_type") || params.get("trade") || "");
  } catch {
    return "field-service";
  }
}

function rowsFor(industry) {
  const title = industry.title;
  if (/clean/i.test(title)) return {
    jobs: [["8:30", "Regular clean", "Northwood Offices", "Mia", "$160", "Weekly"], ["10:15", "Deep clean", "Belmont Unit", "Jess", "$340", "One-off"], ["1:00", "Checklist visit", "Hillcrest", "Lee", "$120", "Fortnightly"]],
    workers: [["Mia", "On site", "Northwood Offices", "Checklist open"], ["Jess", "Finishing", "Belmont Unit", "Photos sent"], ["Lee", "Next visit", "Hillcrest", "Queued"]],
    queue: [["Invoice ready", "Belmont deep clean", "$340", "Approve"], ["Access issue", "Key code failed", "Check", "Edit"], ["Follow-up", "Client asked for extras", "$120", "Park"]],
    form: ["Belmont Unit", "Deep clean", "Jess", "$340", "One-off"],
  };
  if (/painting/i.test(title)) return {
    jobs: [["8:00", "Interior prep", "Karori House", "Sam", "$420", "Stage 1"], ["11:30", "Feature wall", "Belmont Villas", "Jess", "$680", "One-off"], ["2:00", "Touch-up", "Hillcrest", "Lee", "$160", "Follow-up"]],
    workers: [["Sam", "Prepping", "Karori House", "Photos sent"], ["Jess", "Painting", "Belmont Villas", "Progress proof"], ["Lee", "Next job", "Hillcrest", "Queued"]],
    queue: [["Quote accepted", "Feature wall", "$680", "Approve"], ["Extra area", "Hallway added", "Check", "Edit"], ["Invoice ready", "Touch-up", "$160", "Park"]],
    form: ["Belmont Villas", "Feature wall", "Jess", "$680", "One-off"],
  };
  if (/plumbing|electrical|hvac|technical/i.test(title)) return {
    jobs: [["8:00", "Callout", "Northwood", "Ari", "$180", "Urgent"], ["10:45", "Parts install", "Belmont Villas", "Jess", "$460", "One-off"], ["1:30", "Safety check", "Hillcrest", "Lee", "$220", "Follow-up"]],
    workers: [["Ari", "On site", "Northwood", "Parts note"], ["Jess", "Installing", "Belmont Villas", "Proof sent"], ["Lee", "Next callout", "Hillcrest", "Queued"]],
    queue: [["Invoice ready", "Parts install", "$460", "Approve"], ["Safety note", "Owner check", "Check", "Edit"], ["Quote required", "Follow-up repair", "$220", "Park"]],
    form: ["Belmont Villas", "Parts install", "Jess", "$460", "One-off"],
  };
  return {
    jobs: [["8:30", industry.services?.[0] || "Service visit", "Northwood", "Cam", "$95", "Weekly"], ["10:15", industry.services?.[1] || "Job", "Belmont Villas", "Jess", "$340", "One-off"], ["1:00", industry.services?.[2] || "Follow-up", "Hillcrest", "Lee", "$180", "Fortnightly"]],
    workers: [["Cam", "On site", "Belmont Villas", "GPS on"], ["Jess", "Finishing", "Northwood", "Photos sent"], ["Lee", "Next job", "Hillcrest", "Queued"]],
    queue: [["Invoice ready", `${industry.short} work`, "$340", "Approve"], ["Access issue", "Worker note", "Check", "Edit"], ["Quote viewed", "Follow-up", "$780", "Park"]],
    form: ["Belmont Villas", industry.services?.[1] || "Service visit", "Jess", "$340", "One-off"],
  };
}

function Panel({ title, eyebrow, children, className = "", id }) {
  return <section id={id} className={`demoPanel ${className}`}><header>{eyebrow ? <small>{eyebrow}</small> : null}<h3>{title}</h3></header>{children}</section>;
}

export default function PublicDemoPage() {
  const [industryKey, setIndustryKey] = React.useState(queryIndustry);
  const industry = getIndustry(industryKey);
  const demo = rowsFor(industry);

  React.useEffect(() => {
    try {
      const next = new URL(window.location.href);
      next.searchParams.set("industry", industryKey);
      window.history.replaceState({}, "", next.toString());
    } catch {}
  }, [industryKey]);

  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_DEMO_20260710">
      <PublicNav active="/demo" />

      <section className="cp26PageHero">
        <div>
          <Eyebrow>Interactive product sample</Eyebrow>
          <h1>See the Churvox flow for {industry.short.toLowerCase()}.</h1>
          <p>This page uses clearly labelled sample records. The workflow is the point: {industry.flow.join(" → ")}. Work pages hold the facts and Command holds the owner decisions.</p>
          <label className="cp26CountrySelect">
            <span>Demo business type</span>
            <select value={industryKey} onChange={(event) => setIndustryKey(normalizeIndustry(event.target.value))}>
              {industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="cp26HeroActions">
            <a href="#command-demo" className="cp26Button">Jump to Command</a>
            <Link to={`/signup?industry=${encodeURIComponent(industryKey)}`} className="cp26Button cp26ButtonGhost">Start free trial</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>{industry.title}</small>
          <b>The wording follows the business type.</b>
          <span>{industry.intro}</span>
        </div>
      </section>

      <section className="demoAppShell slimDemoShell" aria-label="Churvox public demo app preview">
        <header className="demoTopBar">
          <div><small>Sample business</small><h2>{industry.short} Command preview</h2></div>
          <nav aria-label="Demo sections"><a href="#today-demo">Today</a><a href="#command-demo">Command</a><a href="#jobs-demo">Jobs</a><a href="#workers-demo">Workers</a></nav>
        </header>

        <section id="today-demo" className="demoHeroStrip compactDemoHero">
          <div><small>Today</small><h2>The day is already sorted.</h2><p>{industry.jobWords.jobs}, {industry.jobWords.workers}, owner checks and draft value are visible without hunting through tabs.</p></div>
          <div className="demoStats"><span className="demoStat"><b>3</b><small>{industry.jobWords.jobs}</small></span><span className="demoStat blue"><b>3</b><small>{industry.jobWords.workers}</small></span><span className="demoStat red"><b>3</b><small>checks</small></span><span className="demoStat orange"><b>$615</b><small>drafts</small></span></div>
        </section>

        <section className="demoGrid">
          <Panel title="Run sheet" eyebrow="Today" className="span7">
            <div className="demoList">{demo.jobs.map(([time, title, client, worker, price, repeat]) => <article className="demoRow" key={time + title}><div><b>{time} · {title}</b><span>{client} · {worker} · {repeat}</span></div><em>{price}</em></article>)}</div>
          </Panel>
          <Panel title="Owner checks" eyebrow="Command" className="span5 dark" id="command-demo">
            <div className="demoList compact">{demo.queue.map(([type, title, amount, action]) => <article className="demoRow hot" key={title}><div><b>{type}</b><span>{title} · {amount}</span></div><em>{action}</em></article>)}</div>
          </Panel>
        </section>

        <section id="jobs-demo" className="demoGrid">
          <Panel title="Job record" eyebrow="Prepared admin" className="span6">
            <div className="demoFormPreview"><label><span>{industry.jobWords.client}</span><b>{demo.form[0]}</b></label><label><span>Work</span><b>{demo.form[1]}</b></label><label><span>{industry.jobWords.worker}</span><b>{demo.form[2]}</b></label><label><span>Price</span><b>{demo.form[3]}</b></label><label><span>Repeat</span><b>{demo.form[4]}</b></label></div>
          </Panel>
          <Panel title="Field updates" eyebrow="Workers" className="span6" id="workers-demo">
            <div className="demoList">{demo.workers.map(([name, status, job, tag]) => <article className="demoRow cool" key={name}><div><b>{name}</b><span>{status} · {job}</span></div><em>{tag}</em></article>)}</div>
          </Panel>
        </section>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Your own records next</Eyebrow>
          <h2>Try the flow with your jobs, workers and clients.</h2>
          <p>The trial starts empty and uses your real business records. Nothing from this sample is copied into the account.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link to={`/signup?industry=${encodeURIComponent(industryKey)}`} className="cp26Button">Start free trial</Link>
          <Link to="/pricing" className="cp26Button cp26ButtonGhost">View pricing</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
