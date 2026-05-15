import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./onboardingSetupPage.css";

const STEPS = [
  {
    id: "business",
    title: "Set your business basics",
    text: "Add business name, trade, contact details and default settings.",
    cta: "Open settings",
    href: "/settings",
  },
  {
    id: "clients",
    title: "Add or import clients",
    text: "Create your first client or import existing customers by CSV.",
    cta: "Open clients",
    href: "/clients",
  },
  {
    id: "team",
    title: "Add your workers",
    text: "Invite workers so Churvox can assign jobs and prepare dispatch work.",
    cta: "Open team",
    href: "/team",
  },
  {
    id: "job",
    title: "Create your first job",
    text: "Add a real job so AI can start preparing dispatch, reminders and proof-to-paid work.",
    cta: "Create job",
    href: "/jobs",
  },
  {
    id: "ai",
    title: "Choose your AI control level",
    text: "Pick how much admin AI prepares before owner approval.",
    cta: "Open Smart Hub",
    href: "/ai-approvals",
  },
  {
    id: "proof",
    title: "Turn completed work into invoices",
    text: "Use Proof-to-Paid to review completed jobs and create draft invoices.",
    cta: "Open Proof-to-Paid",
    href: "/proof-to-paid",
  },
];

function readDone() {
  try {
    return JSON.parse(localStorage.getItem("churvox_onboarding_done") || "{}");
  } catch {
    return {};
  }
}

function saveDone(done) {
  localStorage.setItem("churvox_onboarding_done", JSON.stringify(done));
}

export default function OnboardingSetupPage() {
  const [done, setDone] = useState(readDone);
  const completed = useMemo(() => STEPS.filter((s) => done[s.id]).length, [done]);
  const percent = Math.round((completed / STEPS.length) * 100);

  function toggle(id) {
    setDone((current) => {
      const next = { ...current, [id]: !current[id] };
      saveDone(next);
      return next;
    });
  }

  function reset() {
    saveDone({});
    setDone({});
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-hero">
        <div>
          <p>OWNER SETUP</p>
          <h1>Get Churvox ready to run the admin.</h1>
          <span>
            Finish these steps once, then Smart Hub and the Smart Hub can prepare real work:
            assignments, drafts, reminders, invoices and follow-ups.
          </span>
        </div>
        <div className="onboarding-progress">
          <b>{percent}%</b>
          <small>{completed} of {STEPS.length} done</small>
          <div><i style={{ width: `${percent}%` }} /></div>
        </div>
      </section>

      <section className="onboarding-grid">
        {STEPS.map((step, index) => (
          <article className={done[step.id] ? "onboarding-step done" : "onboarding-step"} key={step.id}>
            <div className="onboarding-number">{done[step.id] ? "✓" : index + 1}</div>
            <div>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
              <footer>
                <button type="button" onClick={() => toggle(step.id)}>
                  {done[step.id] ? "Mark not done" : "Mark done"}
                </button>
                <Link to={step.href}>{step.cta}</Link>
              </footer>
            </div>
          </article>
        ))}
      </section>

      <section className="onboarding-finish">
        <div>
          <strong>{completed === STEPS.length ? "Setup complete." : "Keep going."}</strong>
          <p>
            {completed === STEPS.length
              ? "You can now use Smart Hub as your daily command centre."
              : "Complete the remaining steps so AI has enough business data to prepare useful work."}
          </p>
        </div>
        <div>
          <Link to="/dashboard">Open Smart Hub</Link>
          <button type="button" onClick={reset}>Reset checklist</button>
        </div>
      </section>
    </main>
  );
}
