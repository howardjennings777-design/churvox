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

function trialPath(industryKey) {
  return `/signup?plan=operator&industry=${encodeURIComponent(industryKey)}`;
}

function rowsFor(industry) {
  const title = industry.title;
  if (/clean/i.test(title)) return {
    jobs: [["8:30", "Regular clean", "Site A", "Worker A", "$160", "Weekly"], ["10:15", "Deep clean", "Site B", "Worker B", "$340", "One-off"], ["1:00", "Checklist visit", "Site C", "Worker C", "$120", "Fortnightly"]],
    workers: [["Worker A", "On site", "Site A", "Checklist open"], ["Worker B", "Finishing", "Site B", "Photos added"], ["Worker C", "Next visit", "Site C", "Queued"]],
    queue: [["Invoice ready", "Deep clean", "$340", "Approve"], ["Access issue", "Entry details need checking", "Check", "Edit"], ["Follow-up", "Client asked for extras", "$120", "Park"]],
    form: ["Site B", "Deep clean", "Worker B", "$340", "One-off"],
  };
  if (/painting/i.test(title)) return {
    jobs: [["8:00", "Interior prep", "Site A", "Worker A", "$420", "Stage 1"], ["11:30", "Feature wall", "Site B", "Worker B", "$680", "One-off"], ["2:00", "Touch-up", "Site C", "Worker C", "$160", "Follow-up"]],
    workers: [["Worker A", "Preparing", "Site A", "Photos added"], ["Worker B", "Painting", "Site B", "Progress added"], ["Worker C", "Next job", "Site C", "Queued"]],
    queue: [["Quote accepted", "Feature wall", "$680", "Approve"], ["Extra area", "Hallway added", "Check", "Edit"], ["Invoice ready", "Touch-up", "$160", "Park"]],
    form: ["Site B", "Feature wall", "Worker B", "$680", "One-off"],
  };
  if (/plumbing|electrical|hvac|technical/i.test(title)) return {
    jobs: [["8:00", "Callout", "Site A", "Worker A", "$180", "Urgent"], ["10:45", "Parts install", "Site B", "Worker B", "$460", "One-off"], ["1:30", "Safety check", "Site C", "Worker C", "$220", "Follow-up"]],
    workers: [["Worker A", "On site", "Site A", "Parts note"], ["Worker B", "Installing", "Site B", "Work update added"], ["Worker C", "Next callout", "Site C", "Queued"]],
    queue: [["Invoice ready", "Parts install", "$460", "Approve"], ["Safety note", "Owner check", "Check", "Edit"], ["Quote required", "Follow-up repair", "$220", "Park"]],
    form: ["Site B", "Parts install", "Worker B", "$460", "One-off"],
  };
  return {
    jobs: [["8:30", industry.services?.[0] || "Service visit", "Site A", "Worker A", "$95", "Weekly"], ["10:15", industry.services?.[1] || "Job", "Site B", "Worker B", "$340", "One-off"], ["1:00", industry.services?.[2] || "Follow-up", "Site C", "Worker C", "$180", "Fortnightly"]],
    workers: [["Worker A", "On site", "Site A", "Location shared"], ["Worker B", "Finishing", "Site B", "Photos added"], ["Worker C", "Next job", "Site C", "Queued"]],
    queue: [["Invoice ready", `${industry.short} work`, "$340", "Approve"], ["Access issue", "Worker note", "Check", "Edit"], ["Quote viewed", "Follow-up", "$780", "Park"]],
    form: ["Site B", industry.services?.[1] || "Service visit", "Worker B", "$340", "One-off"],
  };
}

function journeyFor(industry, preview) {
  const [client, work, worker, price, repeat] = preview.form;
  return [
    ["Request", `${client} asks for ${work.toLowerCase()}`, `Churvox captures the request and attaches it to the right ${industry.jobWords.client.toLowerCase()} record.`, "Check only anything unclear."],
    ["Plan", "The job record is prepared", `${worker}, timing, price basis and ${repeat.toLowerCase()} details are placed together.`, "Approve or adjust the plan."],
    ["Field", `${worker} receives one clear job`, "Directions, work details, notes and status stay attached to the same record.", "Step in only when an exception is raised."],
    ["Proof", "Completion evidence is checked", "Time, notes, checklist details and photos are checked before money moves.", "Resolve missing or unusual details."],
    ["Money", `${price} invoice is ready`, "The completed work, amount and proof are combined into an editable owner decision.", "Approve, edit or park."],
    ["Next", "The next useful action is prepared", "A follow-up, repeat visit or quote is prepared from the real job history.", "Approve it only when it makes sense."],
  ];
}

function Panel({ title, eyebrow, children, className = "", id }) {
  return <section id={id} className={`demoPanel ${className}`}><header>{eyebrow ? <small>{eyebrow}</small> : null}<h3>{title}</h3></header>{children}</section>;
}

export default function PublicDemoPage() {
  const [industryKey, setIndustryKey] = React.useState(queryIndustry);
  const [activeStep, setActiveStep] = React.useState(0);
  const industry = getIndustry(industryKey);
  const preview = rowsFor(industry);
  const journey = journeyFor(industry, preview);
  const step = journey[activeStep] || journey[0];

  React.useEffect(() => {
    setActiveStep(0);
    try {
      const next = new URL(window.location.href);
      next.searchParams.set("industry", industryKey);
      window.history.replaceState({}, "", next.toString());
    } catch {}
  }, [industryKey]);

  return (
    <main className="cp26Site">
      <PublicNav active="/demo" />

      <section className="cp26PageHero">
        <div>
          <Eyebrow>60-second guided workday</Eyebrow>
          <h1>Watch Churvox handle a {industry.short.toLowerCase()} job.</h1>
          <p>This guided example contains invented business information only. Choose the business type, move through the six stages and see where Churvox prepares the work and where the owner approves.</p>
          <label className="cp26CountrySelect">
            <span>Business type</span>
            <select value={industryKey} onChange={(event) => setIndustryKey(normalizeIndustry(event.target.value))}>
              {industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="cp26HeroActions">
            <a href="#command-demo" className="cp26Button">Run the workday</a>
            <Link to={trialPath(industryKey)} className="cp26Button cp26ButtonGhost">Start free trial</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>Guided example</small>
          <b>{industry.title} owner control room</b>
          <span>{industry.intro}</span>
        </div>
      </section>

      <section id="command-demo" className="cp26Section cp26DemoJourneySection">
        <div className="cp26Journey">
          <nav className="cp26JourneyRail" aria-label="Guided Churvox workday">
            {journey.map((item, index) => (
              <button key={item[0]} type="button" className={activeStep === index ? "active" : ""} aria-pressed={activeStep === index} onClick={() => setActiveStep(index)}>
                <b>{index + 1}</b><span>{item[0]}</span>
              </button>
            ))}
          </nav>
          <article className="cp26JourneyStage">
            <div className="cp26JourneyStory">
              <small>Step {activeStep + 1} of {journey.length} · example information only</small>
              <h3>{step[1]}</h3>
              <p>{step[2]}</p>
            </div>
            <div className="cp26JourneyDecision">
              <section><span>Churvox prepares</span><b>{step[2]}</b></section>
              <section><span>The owner does</span><b>{step[3]}</b></section>
              <section><span>The rule</span><b>Nothing sends, syncs, charges or changes without owner approval.</b></section>
            </div>
            <div className="cp26JourneyControls">
              <button type="button" onClick={() => setActiveStep((current) => Math.max(0, current - 1))} disabled={activeStep === 0}>Back</button>
              <button type="button" className="primary" onClick={() => setActiveStep((current) => Math.min(journey.length - 1, current + 1))} disabled={activeStep === journey.length - 1}>Next step</button>
              <Link to={trialPath(industryKey)}>Try it with my records</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="demoAppShell slimDemoShell" aria-label="Churvox product preview">
        <header className="demoTopBar">
          <div>
            <small data-cv-allow-verbatim="true">Preview workspace · clearly labelled {"sample "}{"records"}</small>
            <small data-cv-allow-verbatim="true">{"Sample "}{"business"}</small>
            <h2>{industry.short} Command preview</h2>
          </div>
          <nav aria-label="Preview sections"><a href="#today-preview">Today</a><a href="#command-demo">Command</a><a href="#jobs-preview">Jobs</a><a href="#workers-preview">Workers</a></nav>
        </header>

        <section id="today-preview" className="demoHeroStrip compactDemoHero">
          <div><small>Today</small><h2>The day is already sorted.</h2><p>{industry.jobWords.jobs}, {industry.jobWords.workers}, owner checks and draft value are visible without hunting through tabs.</p></div>
          <div className="demoStats"><span className="demoStat"><b>3</b><small>{industry.jobWords.jobs}</small></span><span className="demoStat blue"><b>3</b><small>{industry.jobWords.workers}</small></span><span className="demoStat red"><b>3</b><small>checks</small></span><span className="demoStat orange"><b>$615</b><small>drafts</small></span></div>
        </section>

        <section className="demoGrid">
          <Panel title="Run sheet" eyebrow="Today" className="span7">
            <div className="demoList">{preview.jobs.map(([time, title, client, worker, price, repeat]) => <article className="demoRow" key={time + title}><div><b>{time} · {title}</b><span>{client} · {worker} · {repeat}</span></div><em>{price}</em></article>)}</div>
          </Panel>
          <Panel title="Owner checks" eyebrow="Command" className="span5 dark">
            <div className="demoList compact">{preview.queue.map(([type, title, amount, action]) => <article className="demoRow hot" key={title}><div><b>{type}</b><span>{title} · {amount}</span></div><em>{action}</em></article>)}</div>
          </Panel>
        </section>

        <section id="jobs-preview" className="demoGrid">
          <Panel title="Job record" eyebrow="Prepared admin" className="span6">
            <div className="demoFormPreview"><label><span>{industry.jobWords.client}</span><b>{preview.form[0]}</b></label><label><span>Work</span><b>{preview.form[1]}</b></label><label><span>{industry.jobWords.worker}</span><b>{preview.form[2]}</b></label><label><span>Price</span><b>{preview.form[3]}</b></label><label><span>Repeat</span><b>{preview.form[4]}</b></label></div>
          </Panel>
          <Panel title="Field updates" eyebrow="Workers" className="span6" id="workers-preview">
            <div className="demoList">{preview.workers.map(([name, status, job, tag]) => <article className="demoRow cool" key={name}><div><b>{name}</b><span>{status} · {job}</span></div><em>{tag}</em></article>)}</div>
          </Panel>
        </section>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Your records next</Eyebrow>
          <h2>Organise one real job before setting up everything else.</h2>
          <p>Your account starts empty and uses only the records you add. Nothing from this sample is copied into the account.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link to={trialPath(industryKey)} className="cp26Button">Start free trial</Link>
          <Link to="/pricing" className="cp26Button cp26ButtonGhost">View pricing</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
