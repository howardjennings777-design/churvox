import React from "react";
import { Link } from "react-router-dom";
import { getIndustry, industryOptions, normalizeIndustry } from "../../config/churvoxIndustrySystem";
import { PublicNav, PublicFooter, Eyebrow } from "./ChurvoxPublicShell";
import "./PublicDemoPage.css";
import "./GuidedWorkdayPublic.css";

function queryIndustry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeIndustry(params.get("industry") || params.get("business_type") || params.get("trade") || "property-maintenance");
  } catch {
    return "property-maintenance";
  }
}

function trialPath(industryKey) {
  return `/signup?plan=operator&industry=${encodeURIComponent(industryKey)}&first_setup=1`;
}

function serviceFor(industry) {
  return industry.services?.[0] || "Property maintenance visit";
}

function journeyFor(industry) {
  const service = serviceFor(industry);
  return [
    {
      key: "request",
      label: "Request",
      title: `A customer asks the business for ${service.toLowerCase()}`,
      prepares: "Churvox captures the customer, address, requested work and preferred timing in one clean request.",
      owner: "The owner checks anything unclear before saving it.",
      status: "New request",
      proof: "Customer details captured",
    },
    {
      key: "job",
      label: "Job",
      title: "The client and job are prepared together",
      prepares: "The real client record, job notes, price basis, schedule and repeat details are placed in the right fields.",
      owner: "The owner approves the job or edits the details.",
      status: "Ready for approval",
      proof: "Job value $340",
    },
    {
      key: "command",
      label: "Approve",
      title: "Command shows one clear owner decision",
      prepares: "Churvox explains what it found, what it prepared and what will happen after approval.",
      owner: "The owner chooses Approve, Edit or Park. Nothing changes before that choice.",
      status: "Owner approved",
      proof: "Approval recorded",
    },
    {
      key: "worker",
      label: "Worker",
      title: "The worker receives one complete job",
      prepares: "Address, access notes, work details, timing and customer-safe instructions stay attached to the job.",
      owner: "The owner only steps in if the worker raises an exception.",
      status: "In progress",
      proof: "Worker acknowledged",
    },
    {
      key: "proof",
      label: "Proof",
      title: "The work is finished with evidence",
      prepares: "Completion notes, time and customer-visible photos are checked against the job before invoicing.",
      owner: "The owner reviews any missing detail or extra work.",
      status: "Completed",
      proof: "3 photos · notes saved",
    },
    {
      key: "invoice",
      label: "Invoice",
      title: "The invoice and secure payment link are ready",
      prepares: "The completed work becomes an editable invoice. After the owner approves, Churvox creates a secure Stripe payment link.",
      owner: "The owner approves the invoice and chooses when to share the link.",
      status: "Payment due",
      proof: "$340 invoice approved",
    },
    {
      key: "paid",
      label: "Paid",
      title: "The customer pays and Churvox verifies it",
      prepares: "Stripe handles the card payment. A verified payment event updates the invoice and places the result in the owner dashboard.",
      owner: "The owner sees the confirmed payment and decides the next follow-up.",
      status: "Paid",
      proof: "$340 received",
    },
  ];
}

function StagePreview({ step, industry }) {
  const paid = step.key === "paid";
  const invoiceReady = ["invoice", "paid"].includes(step.key);
  const workerStarted = ["worker", "proof", "invoice", "paid"].includes(step.key);
  const completed = ["proof", "invoice", "paid"].includes(step.key);
  return (
    <section className="demoAppShell slimDemoShell" aria-label="Harbour Property Services example workspace">
      <header className="demoTopBar">
        <div>
          <small>Invented example records only</small>
          <h2>Harbour Property Services</h2>
        </div>
        <nav aria-label="Example workspace sections"><span>Today</span><span>Command</span><span>Jobs</span><span>Invoices</span></nav>
      </header>

      <section className="demoHeroStrip compactDemoHero">
        <div>
          <small>Current stage · {step.label}</small>
          <h2>{step.title}</h2>
          <p>{step.prepares}</p>
        </div>
        <div className="demoStats">
          <span className="demoStat"><b>1</b><small>client</small></span>
          <span className="demoStat blue"><b>1</b><small>job</small></span>
          <span className="demoStat red"><b>{completed ? 3 : 0}</b><small>photos</small></span>
          <span className="demoStat orange"><b>{paid ? "$340" : "$0"}</b><small>received</small></span>
        </div>
      </section>

      <section className="demoGrid">
        <section className="demoPanel span7">
          <header><small>Real record flow</small><h3>Customer and job</h3></header>
          <div className="demoFormPreview">
            <label><span>Customer</span><b>Alex Morgan</b></label>
            <label><span>Work</span><b>{serviceFor(industry)}</b></label>
            <label><span>Address</span><b>24 Harbour View Road</b></label>
            <label><span>Worker</span><b>{workerStarted ? "Mia — acknowledged" : "Mia — prepared"}</b></label>
            <label><span>Status</span><b>{step.status}</b></label>
          </div>
        </section>
        <section className="demoPanel span5 dark">
          <header><small>Command</small><h3>The owner’s decision</h3></header>
          <div className="demoList compact">
            <article className="demoRow hot"><div><b>Churvox prepares</b><span>{step.prepares}</span></div><em>Prepared</em></article>
            <article className="demoRow hot"><div><b>The owner does</b><span>{step.owner}</span></div><em>Owner</em></article>
            <article className="demoRow hot"><div><b>Proof</b><span>{step.proof}</span></div><em>{step.status}</em></article>
          </div>
        </section>
      </section>

      <section className="demoGrid">
        <section className="demoPanel span6">
          <header><small>Worker update</small><h3>{workerStarted ? "Field work connected to the job" : "Worker details prepared"}</h3></header>
          <div className="demoList">
            <article className="demoRow cool"><div><b>Mia Thompson</b><span>{completed ? "Job completed · notes and photos added" : workerStarted ? "On site · timer running" : "Job ready after the owner approves"}</span></div><em>{completed ? "Complete" : workerStarted ? "Working" : "Waiting"}</em></article>
          </div>
        </section>
        <section className="demoPanel span6">
          <header><small>Money</small><h3>{paid ? "Payment confirmed" : invoiceReady ? "Invoice ready for payment" : "Invoice waits for completed work"}</h3></header>
          <div className="demoList">
            <article className={`demoRow ${paid ? "cool" : ""}`}><div><b>INV-1001 · $340.00</b><span>{paid ? "Stripe verified · invoice marked paid" : invoiceReady ? "Owner approved · secure link ready" : "Not created until the job is complete"}</span></div><em>{paid ? "Paid ✓" : invoiceReady ? "Pay securely" : "Waiting"}</em></article>
          </div>
        </section>
      </section>
    </section>
  );
}

export default function PublicDemoPage() {
  const [industryKey, setIndustryKey] = React.useState(queryIndustry);
  const [activeStep, setActiveStep] = React.useState(0);
  const industry = getIndustry(industryKey);
  const journey = journeyFor(industry);
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
          <Eyebrow>Two-minute interactive example</Eyebrow>
          <h1>Follow one job from customer request to money received.</h1>
          <p>Meet the owner of a small property-maintenance business. Click through one invented job and see exactly what Churvox prepares, what the owner approves and how a verified Stripe payment closes the loop.</p>
          <label className="cp26CountrySelect">
            <span>Show this example for</span>
            <select value={industryKey} onChange={(event) => setIndustryKey(normalizeIndustry(event.target.value))}>
              {industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="cp26HeroActions">
            <a href="#first-win-demo" className="cp26Button">Start the example</a>
            <Link to={trialPath(industryKey)} className="cp26Button cp26ButtonGhost">Try it with one real job</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>Example journey</small>
          <b>Harbour Property Services</b>
          <span>One client · one job · one owner approval · one invoice · one verified payment.</span>
        </div>
      </section>

      <section id="first-win-demo" className="cp26Section cp26DemoJourneySection">
        <div className="cp26Journey">
          <nav className="cp26JourneyRail" aria-label="First-win example stages">
            {journey.map((item, index) => (
              <button key={item.key} type="button" className={activeStep === index ? "active" : ""} aria-pressed={activeStep === index} onClick={() => setActiveStep(index)}>
                <b>{index + 1}</b><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <article className="cp26JourneyStage">
            <div className="cp26JourneyStory">
              <small>Step {activeStep + 1} of {journey.length} · invented information only</small>
              <h3>{step.title}</h3>
              <p>{step.prepares}</p>
            </div>
            <div className="cp26JourneyDecision">
              <section><span>Churvox prepares</span><b>{step.prepares}</b></section>
              <section><span>Owner approves</span><b>{step.owner}</b></section>
              <section><span>Result</span><b>{step.proof} · {step.status}</b></section>
            </div>
            <div className="cp26JourneyControls">
              <button type="button" onClick={() => setActiveStep((current) => Math.max(0, current - 1))} disabled={activeStep === 0}>Back</button>
              <button type="button" className="primary" onClick={() => setActiveStep((current) => Math.min(journey.length - 1, current + 1))} disabled={activeStep === journey.length - 1}>Next step</button>
              <Link to={trialPath(industryKey)}>Try one real job</Link>
            </div>
          </article>
        </div>
      </section>

      <StagePreview step={step} industry={industry} />

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Your first win</Eyebrow>
          <h2>Do not set up everything. Start with one real customer and one real job.</h2>
          <p>The First Win Guide then walks you through the client, job, invoice, Command approval and payment steps using your own records.</p>
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
