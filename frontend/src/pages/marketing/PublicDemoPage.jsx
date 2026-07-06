import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";
import "./PublicDemoPage.css";

const commandQueue = [
  ["Invoice draft ready", "Belmont Villas hedge trim", "$340", "Approve"],
  ["Worker issue", "Gate locked at Northwood", "Needs check", "Edit"],
  ["Quote follow-up", "Garden tidy quote viewed", "$780", "Park"],
];

const jobs = [
  ["8:30", "Lawn mow", "Northwood", "Cam", "$95", "Weekly"],
  ["10:15", "Hedge trim", "Belmont Villas", "Jess", "$340", "One-off"],
  ["1:00", "Gutter clean", "Hillcrest", "Lee", "$180", "Fortnightly"],
  ["3:30", "Garden tidy", "Karori", "Cam", "$260", "Monthly"],
];

const workers = [
  ["Cam", "In progress", "Belmont Villas", "GPS on", "2 photos"],
  ["Jess", "Finishing", "Northwood", "Directions opened", "Note sent"],
  ["Lee", "Not started", "Hillcrest", "Queued", "No issue"],
];

const actions = [
  ["Smart Assign", "Suggests the best worker by area, skills and workload."],
  ["Smart Schedule", "Finds a sensible time without crowding the run sheet."],
  ["Smart Quote Builder", "Prepares quote drafts from client and job details."],
  ["Smart Invoice Builder", "Builds invoice drafts from price, notes, proof and time."],
  ["Smart Problem Slip", "Turns worker issues into clear owner decisions."],
  ["Smart Day Close", "Wraps up jobs, messages and tomorrow checks."],
];

function Stat({ value, label, tone = "" }) {
  return <span className={`demoStat ${tone}`}><b>{value}</b><small>{label}</small></span>;
}

function Panel({ title, eyebrow, children, className = "" }) {
  return <section className={`demoPanel ${className}`}><header>{eyebrow ? <small>{eyebrow}</small> : null}<h3>{title}</h3></header>{children}</section>;
}

export default function PublicDemoPage() {
  return (
    <main className="publicSite publicDemoSite" data-version="CHURVOX_PUBLIC_DEMO_20260706">
      <Nav />

      <section className="publicHero publicDemoHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Public demo</span>
          <h1>See how Churvox feels before logging in.</h1>
          <p>This safe demo uses example jobs, workers, messages, invoice drafts and owner approvals. No real client data is shown.</p>
          <div className="publicActions">
            <a href="#command-demo" className="publicPrimary">Open Command preview</a>
            <Link to="/signup" className="publicSecondary">Start 14-day trial</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel publicDemoHeroCard">
          <small>Core promise</small>
          <b>Churvox does the admin. You approve.</b>
          <span>Work comes in, Churvox prepares the next step, and important decisions wait in Command.</span>
        </aside>
      </section>

      <section className="demoAppShell" aria-label="Churvox public demo app preview">
        <header className="demoTopBar">
          <div><small>Owner command floor</small><h2>Churvox Demo Co.</h2></div>
          <nav aria-label="Demo sections"><a href="#today-demo">Today</a><a href="#command-demo">Command</a><a href="#jobs-demo">Jobs</a><a href="#workers-demo">Workers</a><a href="#money-demo">Money</a></nav>
        </header>

        <section id="today-demo" className="demoHeroStrip">
          <div><small>Today</small><h2>Run the business without hunting.</h2><p>Jobs, workers, messages, money and owner checks sit together so the day is obvious.</p></div>
          <div className="demoStats"><Stat value="4" label="jobs" /><Stat value="3" label="workers" tone="blue" /><Stat value="3" label="checks" tone="red" /><Stat value="$615" label="invoice value" tone="orange" /></div>
        </section>

        <section className="demoGrid">
          <Panel title="Today run sheet" eyebrow="Work moving" className="span7">
            <div className="demoList">{jobs.slice(0, 3).map(([time, title, client, worker, price, repeat]) => <article className="demoRow" key={time + title}><div><b>{time} · {title}</b><span>{client} · {worker} · {repeat}</span></div><em>{price}</em></article>)}</div>
          </Panel>
          <Panel title="Waiting for owner" eyebrow="Command" className="span5 dark">
            <div className="demoList compact">{commandQueue.map(([type, title, amount, action]) => <article className="demoRow hot" key={title}><div><b>{type}</b><span>{title} · {amount}</span></div><em>{action}</em></article>)}</div>
          </Panel>
        </section>

        <section id="command-demo" className="demoCommandSection">
          <div className="demoSectionHead"><span className="publicKicker">Command</span><h2>The owner approval desk.</h2><p>Approve, edit and park live in Command so ready-to-send admin is not scattered around the product.</p></div>
          <div className="demoSlipGrid">{commandQueue.map(([type, title, amount, action]) => <article key={title} className="demoSlip"><small>{type}</small><h3>{title}</h3><p>Client, job, proof and suggested next step sit together for owner review.</p><div><span>{amount}</span><b>{action}</b></div></article>)}</div>
        </section>

        <section id="jobs-demo" className="demoGrid">
          <Panel title="Jobs" eyebrow="Editable run sheet" className="span7">
            <div className="demoTable"><div className="demoTableHead"><span>Time</span><span>Job</span><span>Worker</span><span>Price</span></div>{jobs.map(([time, title, client, worker, price, repeat]) => <div key={time + client}><span>{time}</span><b>{title}<small>{client} · {repeat}</small></b><span>{worker}</span><strong>{price}</strong></div>)}</div>
          </Panel>
          <Panel title="Job form" eyebrow="What the owner sees" className="span5">
            <div className="demoFormPreview"><label><span>Client</span><b>Belmont Villas</b></label><label><span>Service</span><b>Hedge trim</b></label><label><span>Assigned worker</span><b>Jess</b></label><label><span>Price NZD</span><b>$340</b></label><label><span>Frequency</span><b>One-off</b></label><label><span>Billing type</span><b>Fixed + extras</b></label></div>
          </Panel>
        </section>

        <section id="workers-demo" className="demoGrid">
          <Panel title="Workers" eyebrow="Field view" className="span6">
            <div className="demoList">{workers.map(([name, status, job, gps, proof]) => <article className="demoRow cool" key={name}><div><b>{name}</b><span>{status} · {job} · {proof}</span></div><em>{gps}</em></article>)}</div>
          </Panel>
          <Panel title="Worker to owner loop" eyebrow="Example update" className="span6 dark">
            <div className="demoWorkerLoop"><span>Worker sends</span><b>Gate locked. Customer asked for extra hedge trim. Photos attached.</b><span>Churvox prepares</span><b>Problem slip with client, job, note, proof and suggested next step.</b><span>Owner decides</span><b>Approve change, edit reply, or park it in Command.</b></div>
          </Panel>
        </section>

        <section className="demoCommandSection">
          <div className="demoSectionHead"><span className="publicKicker">Smart Actions</span><h2>Useful help without taking control away.</h2><p>Churvox can prepare the next admin step, but the owner still checks and approves.</p></div>
          <div className="demoActionGrid">{actions.map(([title, copy]) => <article key={title}><b>{title}</b><span>{copy}</span></article>)}</div>
        </section>

        <section id="money-demo" className="demoGrid">
          <Panel title="Invoices" eyebrow="Money stays controlled" className="span7">
            <div className="demoTable money"><div className="demoTableHead"><span>No.</span><span>Client</span><span>Status</span><span>Total</span></div><div><span>INV-1042</span><b>Belmont Villas<small>Ready for owner</small></b><span>Draft</span><strong>$340</strong></div><div><span>INV-1043</span><b>Northwood<small>Waiting to send</small></b><span>Due</span><strong>$95</strong></div><div><span>INV-1044</span><b>Hillcrest<small>Waiting on proof</small></b><span>Parked</span><strong>$180</strong></div></div>
          </Panel>
          <Panel title="Safe handoff" eyebrow="Owner control" className="span5">
            <ul className="demoGuardrails"><li>Invoice drafts are reviewed first</li><li>Accounting handoff stays controlled</li><li>Payroll review stays owner checked</li><li>Important decisions return to Command</li></ul>
          </Panel>
        </section>
      </section>

      <section className="publicBand publicCta publicDemoCta">
        <div><span className="publicKicker">Use this for demos</span><h2>Send people to churvox.com/demo.</h2><p>It shows the Churvox workflow without needing a login or private business records.</p></div>
        <div className="publicActions"><Link to="/signup" className="publicPrimary">Start 14-day trial</Link><Link to="/pricing" className="publicSecondary">View pricing</Link></div>
      </section>

      <Footer />
    </main>
  );
}
