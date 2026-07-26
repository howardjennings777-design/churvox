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

function amountFor(industry) {
  const title = String(industry.title || "");
  if (/landscap/i.test(title)) return "NZ$1,280";
  if (/paint/i.test(title)) return "NZ$680";
  if (/plumb|electric|hvac|technical/i.test(title)) return "NZ$460";
  if (/clean/i.test(title)) return "NZ$340";
  if (/barber|hair|beauty|salon/i.test(title)) return "NZ$95";
  return "NZ$340";
}

function buildWalkthrough(industry) {
  const service = industry.services?.[1] || industry.services?.[0] || "Service visit";
  const clientLabel = industry.jobWords?.client || "Client";
  const workerLabel = industry.jobWords?.worker || "Worker";
  const proofLabel = industry.jobWords?.proof || "Proof";
  const amount = amountFor(industry);

  return {
    record: {
      client: "Kauri Street",
      service,
      worker: "Alex",
      date: "Tuesday · 10:30 am",
      amount,
      repeat: /clean|lawn|garden|pest/i.test(industry.title || "") ? "Fortnightly" : "One-off",
    },
    steps: [
      {
        key: "request",
        label: "Request",
        title: `${clientLabel} request received`,
        summary: `Churvox captures the ${service.toLowerCase()} request, contact details and useful notes in one place.`,
        prepared: "A clean request record with the next missing detail highlighted.",
        owner: "Check only anything unclear.",
        status: "New request",
        progress: 12,
        activity: ["Request captured", "Contact details attached", "Missing details highlighted"],
      },
      {
        key: "plan",
        label: "Plan",
        title: "The job is ready to approve",
        summary: `The ${workerLabel.toLowerCase()}, timing, price basis and repeat setting are brought together before the job is released.`,
        prepared: `${workerLabel}, date, time, price and job instructions.`,
        owner: "Approve the plan or change any detail.",
        status: "Ready for owner",
        progress: 30,
        activity: ["Job record prepared", `${workerLabel} suggested`, "Price basis checked"],
      },
      {
        key: "field",
        label: "Worker",
        title: `${workerLabel} has one clear job`,
        summary: "The field view keeps directions, work details, notes and status attached to the same job record.",
        prepared: "A focused field job with no office clutter.",
        owner: "Step in only when an issue is raised.",
        status: "In progress",
        progress: 52,
        activity: ["Job acknowledged", "Work started", "Office can see progress"],
      },
      {
        key: "proof",
        label: "Proof",
        title: `${proofLabel} has returned from the field`,
        summary: "Time, notes, checklist details and photos return to the job before a money step is prepared.",
        prepared: "Completion evidence connected to the correct job.",
        owner: "Review only missing or unusual details.",
        status: "Proof returned",
        progress: 72,
        activity: ["Completion note received", `${proofLabel} attached`, "Time checked"],
      },
      {
        key: "money",
        label: "Invoice",
        title: `${amount} invoice draft is ready`,
        summary: "The completed work, price and proof are combined into an editable invoice decision for the owner.",
        prepared: "An invoice draft based on the approved job record.",
        owner: "Approve, edit or park before sending.",
        status: "Invoice ready",
        progress: 90,
        activity: ["Job total checked", "Invoice draft prepared", "Waiting for owner"],
      },
      {
        key: "next",
        label: "Next",
        title: "The next useful action is prepared",
        summary: "Churvox uses the real job history to prepare the follow-up, repeat visit or quote without silently doing it.",
        prepared: "A sensible next step based on the completed job.",
        owner: "Approve it only when it makes sense.",
        status: "Next action ready",
        progress: 100,
        activity: ["Job history updated", "Next visit suggested", "Owner decision waiting"],
      },
    ],
  };
}

function RecordField({ label, value }) {
  return (
    <div className="cvDemoField">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function PublicDemoPage() {
  const [industryKey, setIndustryKey] = React.useState(queryIndustry);
  const [activeStep, setActiveStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const industry = getIndustry(industryKey);
  const walkthrough = React.useMemo(() => buildWalkthrough(industry), [industry]);
  const step = walkthrough.steps[activeStep] || walkthrough.steps[0];

  React.useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") || "";
    document.title = `Churvox demo | See a ${industry.short} job from request to invoice`;
    description?.setAttribute("content", `Use the interactive Churvox demo to follow a ${industry.short.toLowerCase()} job through planning, worker updates, proof and owner-approved invoicing.`);
    return () => {
      document.title = previousTitle;
      if (description) description.setAttribute("content", previousDescription);
    };
  }, [industry.short]);

  React.useEffect(() => {
    setActiveStep(0);
    setIsPlaying(false);
    try {
      const next = new URL(window.location.href);
      next.searchParams.set("industry", industryKey);
      window.history.replaceState({}, "", next.toString());
    } catch {}
  }, [industryKey]);

  React.useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= walkthrough.steps.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1900);
    return () => window.clearInterval(timer);
  }, [isPlaying, walkthrough.steps.length]);

  const goToStep = (index) => {
    setIsPlaying(false);
    setActiveStep(index);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setActiveStep(0);
  };

  return (
    <main className="cp26Site cpWorld cvDemoPage" data-room="demo">
      <PublicNav active="/demo" />

      <section className="cvDemoHero">
        <div className="cvDemoHeroCopy">
          <Eyebrow>Interactive Churvox demo</Eyebrow>
          <h1>See one job move from request to invoice.</h1>
          <p>Choose your business type, then click through a real Churvox-style workday. You will see what Churvox prepares, what the worker sees and exactly where the owner stays in control.</p>

          <div className="cvDemoHeroTools">
            <label>
              <span>Show me</span>
              <select value={industryKey} onChange={(event) => setIndustryKey(normalizeIndustry(event.target.value))}>
                {industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" className="cvDemoPlay" onClick={() => {
              if (activeStep >= walkthrough.steps.length - 1) setActiveStep(0);
              setIsPlaying((current) => !current);
            }}>
              {isPlaying ? "Pause walkthrough" : "Play walkthrough"}
            </button>
          </div>

          <div className="cvDemoHeroActions">
            <a href="#interactive-demo" className="cp26Button">Open the demo</a>
            <Link to={trialPath(industryKey)} className="cp26Button cp26ButtonGhost">Start 14-day trial</Link>
          </div>
        </div>

        <aside className="cvDemoPromise" aria-label="What this demo proves">
          <small>What you will see</small>
          <strong>Churvox does the admin.</strong>
          <strong>The owner checks and approves.</strong>
          <p>Example information only. Nothing is sent, charged, synced or saved.</p>
        </aside>
      </section>

      <section id="interactive-demo" className="cvDemoSection" aria-label="Interactive Churvox job walkthrough">
        <div className="cvDemoShell">
          <header className="cvDemoTopbar">
            <div>
              <span className="cvDemoBrandMark">C</span>
              <div>
                <small>Example workspace · {industry.title}</small>
                <b>{walkthrough.record.service}</b>
              </div>
            </div>
            <span className="cvDemoStatus">{step.status}</span>
          </header>

          <nav className="cvDemoSteps" aria-label="Demo stages">
            {walkthrough.steps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={activeStep === index ? "active" : activeStep > index ? "complete" : ""}
                aria-current={activeStep === index ? "step" : undefined}
                onClick={() => goToStep(index)}
              >
                <span>{activeStep > index ? "✓" : index + 1}</span>
                <b>{item.label}</b>
              </button>
            ))}
          </nav>

          <div className="cvDemoProgress" aria-hidden="true"><span style={{ width: `${step.progress}%` }} /></div>

          <div className="cvDemoWorkspace">
            <article className="cvDemoStory" aria-live="polite">
              <small>Step {activeStep + 1} of {walkthrough.steps.length}</small>
              <h2>{step.title}</h2>
              <p>{step.summary}</p>

              <div className="cvDemoDecisionGrid">
                <section>
                  <span>Churvox prepares</span>
                  <b>{step.prepared}</b>
                </section>
                <section className="owner">
                  <span>The owner does</span>
                  <b>{step.owner}</b>
                </section>
              </div>

              <div className="cvDemoControls">
                <button type="button" onClick={() => goToStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}>Back</button>
                <button type="button" className="primary" onClick={() => goToStep(Math.min(walkthrough.steps.length - 1, activeStep + 1))} disabled={activeStep === walkthrough.steps.length - 1}>Next step</button>
                <button type="button" className="quiet" onClick={resetDemo}>Restart</button>
              </div>
            </article>

            <aside className="cvDemoRecord" aria-label="Example job record">
              <header>
                <div>
                  <small>{industry.jobWords?.job || "Job"} record</small>
                  <h3>{walkthrough.record.service}</h3>
                </div>
                <span>{step.status}</span>
              </header>

              <div className="cvDemoRecordGrid">
                <RecordField label={industry.jobWords?.client || "Client"} value={walkthrough.record.client} />
                <RecordField label={industry.jobWords?.worker || "Worker"} value={walkthrough.record.worker} />
                <RecordField label="When" value={walkthrough.record.date} />
                <RecordField label="Price" value={walkthrough.record.amount} />
                <RecordField label="Repeat" value={walkthrough.record.repeat} />
                <RecordField label="Owner control" value="Approval required" />
              </div>

              <div className="cvDemoActivity">
                <small>What just happened</small>
                {step.activity.map((item, index) => (
                  <div key={item}><span>{index + 1}</span><b>{item}</b></div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="cvDemoProofBand">
        <div>
          <Eyebrow>Simple on purpose</Eyebrow>
          <h2>One connected record. Fewer loose messages.</h2>
        </div>
        <div className="cvDemoProofCards">
          <article><b>Office</b><span>Client, price, schedule and instructions stay together.</span></article>
          <article><b>Field</b><span>The worker sees the job and returns progress and proof.</span></article>
          <article><b>Owner</b><span>Important messages and money steps wait for approval.</span></article>
        </div>
      </section>

      <section className="cp26Closing cpWorldClosing cvDemoClosing">
        <div>
          <Eyebrow light>Your business next</Eyebrow>
          <h2>Try one real job without setting up everything first.</h2>
          <p>Your account starts empty and uses only the records you add. The public trial lasts 14 days and does not require a card upfront.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link to={trialPath(industryKey)} className="cp26Button">Start 14-day trial</Link>
          <Link to="/pricing" className="cp26Button cp26ButtonGhost">View pricing</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
