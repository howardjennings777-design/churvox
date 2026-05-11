import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./aiSetupGuide.css";

const PAGE_TIPS = {
  "/dashboard": {
    title: "Start in Smart Hub",
    body: "This is the daily command centre. Open the AI Work Queue to review what Churvox prepared.",
    action: "Open AI Work Queue",
    href: "/ai-approvals",
  },
  "/ai-approvals": {
    title: "Review AI-prepared work",
    body: "Open each action, edit the details, then approve or save it as a draft.",
    action: "Open setup guide",
    href: "/onboarding",
  },
  "/import": {
    title: "Import your data first",
    body: "Upload clients first, then workers. AI gets smarter once your real records are in Churvox.",
    action: "Open onboarding",
    href: "/onboarding",
  },
  "/clients": {
    title: "Add your customer list",
    body: "Add clients one by one or use Import Centre if you already have a CSV.",
    action: "Import clients",
    href: "/import",
  },
  "/team": {
    title: "Add workers",
    body: "Add or import workers so Churvox can suggest assignments.",
    action: "Import workers",
    href: "/import",
  },
  "/jobs": {
    title: "Create jobs",
    body: "Once jobs exist, AI can prepare worker assignments, reminders and invoice drafts.",
    action: "Open AI Work Queue",
    href: "/ai-approvals",
  },
  "/proof-to-paid": {
    title: "Completed work becomes draft invoices",
    body: "Review proof, edit invoice wording, then create a draft invoice. Nothing is sent automatically.",
    action: "Open invoices",
    href: "/invoices",
  },
  "/plans": {
    title: "Choose a plan",
    body: "Pick Solo, Team, Pro or Enterprise. Plans control client limits, MYOB access, SMS add-ons and Enterprise user blocks.",
    action: "Open billing",
    href: "/billing",
  },
  "/invoices": {
    title: "Keep cashflow moving",
    body: "AI can prepare invoice reminders and draft messages for owner approval.",
    action: "Open AI Work Queue",
    href: "/ai-approvals",
  },
  "/onboarding": {
    title: "Follow the setup path",
    body: "Work through the checklist so owners always know what to do next.",
    action: "Import clients/workers",
    href: "/import",
  },
};

function hasDismissed() {
  try {
    return localStorage.getItem("churvox_ai_setup_guide_hidden") === "yes";
  } catch {
    return false;
  }
}

export default function AISetupGuide() {
  const location = useLocation();
  const [hidden, setHidden] = useState(hasDismissed);
  const [small, setSmall] = useState(false);

  const tip = useMemo(() => {
    const path = location.pathname;
    const exact = PAGE_TIPS[path];
    if (exact) return exact;

    if (path.startsWith("/jobs")) return PAGE_TIPS["/jobs"];
    if (path.startsWith("/clients")) return PAGE_TIPS["/clients"];
    if (path.startsWith("/team")) return PAGE_TIPS["/team"];
    if (path.startsWith("/invoices")) return PAGE_TIPS["/invoices"];

    return {
      title: "Need help?",
      body: "Churvox can guide the next step. Start with setup, imports, then AI Work Queue.",
      action: "Open setup",
      href: "/onboarding",
    };
  }, [location.pathname]);

  if (hidden) {
    return (
      <button
        className="ai-guide-pill"
        type="button"
        onClick={() => {
          localStorage.removeItem("churvox_ai_setup_guide_hidden");
          setHidden(false);
          setSmall(false);
        }}
      >
        AI help
      </button>
    );
  }

  if (small) {
    return (
      <button className="ai-guide-pill" type="button" onClick={() => setSmall(false)}>
        AI help: {tip.title}
      </button>
    );
  }

  return (
    <aside className="ai-guide-card">
      <header>
        <span>AI HELP</span>
        <div>
          <button type="button" onClick={() => setSmall(true)}>–</button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("churvox_ai_setup_guide_hidden", "yes");
              setHidden(true);
            }}
          >
            ×
          </button>
        </div>
      </header>
      <strong>{tip.title}</strong>
      <p>{tip.body}</p>
      <footer>
        <Link to={tip.href}>{tip.action}</Link>
        <Link to="/import">Import CSV</Link>
      </footer>
    </aside>
  );
}
