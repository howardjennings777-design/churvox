import React from "react";
import { createPortal } from "react-dom";
import ProductAppV3 from "./ProductAppV3";
import "./productAppV6.css";

const CORE_NAV = [
  { id: "today", label: "Today", hint: "Live overview" },
  { id: "command", label: "Command", hint: "Owner checks" },
  { id: "jobs", label: "Jobs", hint: "Run sheet" },
  { id: "schedule", label: "Schedule", hint: "Week view" },
  { id: "clients", label: "Clients", hint: "Customer files" },
  { id: "quotes", label: "Quotes", hint: "Pipeline" },
  { id: "invoices", label: "Invoices", hint: "Money" },
  { id: "team", label: "Team", hint: "People" },
  { id: "messages", label: "Messages", hint: "Replies" },
];

const MORE_NAV = [
  { id: "workers", label: "Workers", hint: "Field activity" },
  { id: "payroll", label: "Payroll", hint: "Timesheet review" },
  { id: "xero", label: "Xero", hint: "Accounting handoff" },
  { id: "settings", label: "Settings", hint: "Business controls" },
  { id: "plans", label: "Plans", hint: "Billing and access" },
  { id: "support", label: "Help", hint: "Setup and support" },
];

const PAGE_LENS = {
  today: {
    eyebrow: "Live business view",
    title: "See the whole day before you touch anything.",
    text: "Work, field activity, owner checks and money are arranged below in the order they need attention.",
    lanes: [["Now", "What is moving"], ["Watch", "Exceptions and approvals"], ["Next", "One clear action"]],
  },
  command: {
    eyebrow: "Owner control",
    title: "Every decision waiting for you, in one room.",
    text: "See what changed, what Churvox checked, what was prepared and exactly what your approval will do.",
    lanes: [["Reason", "Why it reached you"], ["Evidence", "What was checked"], ["Decision", "Approve, edit or park"]],
  },
  jobs: {
    eyebrow: "Work overview",
    title: "Know what is booked, moving and at risk.",
    text: "The run sheet, recurring work and job exceptions stay visible together without hiding the real records.",
    lanes: [["Booked", "Dates and times"], ["Assigned", "Who owns the work"], ["Check", "Late or incomplete"]],
  },
  schedule: {
    eyebrow: "Week overview",
    title: "See the shape of the week at a glance.",
    text: "Timing, worker load and gaps are visible before you open a booking or move the schedule.",
    lanes: [["When", "Dates and start times"], ["Who", "Worker load"], ["Gap", "Work needing a time"]],
  },
  clients: {
    eyebrow: "Client overview",
    title: "Open the customer and see the whole relationship.",
    text: "Contact details, site notes, saved pricing and linked work history stay in one obvious place.",
    lanes: [["Contact", "Who and where"], ["Memory", "Notes and pricing"], ["History", "Jobs, quotes, invoices"]],
  },
  quotes: {
    eyebrow: "Sales overview",
    title: "See every quote by stage, value and next move.",
    text: "Drafts, follow-ups, accepted work and conversion to a job are visible without digging through menus.",
    lanes: [["Stage", "Where it sits"], ["Value", "What it is worth"], ["Next", "Follow up or convert"]],
  },
  invoices: {
    eyebrow: "Money overview",
    title: "Know what is drafted, due, overdue and paid.",
    text: "The ledger and owner guardrails stay together so money never disappears behind a report or integration.",
    lanes: [["Draft", "Needs review"], ["Due", "Waiting for payment"], ["Paid", "Confirmed money"]],
  },
  team: {
    eyebrow: "People overview",
    title: "See who has access and what they can do.",
    text: "Roles, invitations and worker access are clear before you open a person or change permissions.",
    lanes: [["Person", "Who is connected"], ["Role", "What they do"], ["Access", "What they can see"]],
  },
  messages: {
    eyebrow: "Communication overview",
    title: "Turn messages into clear next steps.",
    text: "Worker notes, customer replies and drafted responses stay connected to the right job and client.",
    lanes: [["Source", "Who contacted you"], ["Context", "Job or client"], ["Reply", "What needs approval"]],
  },
  workers: {
    eyebrow: "Field overview",
    title: "Know what is happening outside the office.",
    text: "Worker status, current jobs, proof, messages and time checks are visible before opening a worker.",
    lanes: [["Status", "Who is active"], ["Work", "Current assignment"], ["Proof", "Photos, notes and time"]],
  },
  payroll: {
    eyebrow: "Payroll overview",
    title: "Review hours without turning Churvox into payroll software.",
    text: "Timesheets, review status and export stay clear. Tax filing and bank payout files remain outside Churvox.",
    lanes: [["Hours", "Recorded time"], ["Check", "What needs review"], ["Export", "Owner or bookkeeper"]],
  },
  xero: {
    eyebrow: "Accounting overview",
    title: "See the connection and every draft waiting to move.",
    text: "Connection status, invoice drafts and safety rules are visible before any approved accounting handoff.",
    lanes: [["Connection", "Xero status"], ["Drafts", "Ready invoices"], ["Guard", "Owner-approved sync"]],
  },
  settings: {
    eyebrow: "Business controls",
    title: "Find the settings that actually change how Churvox works.",
    text: "Branding, GST, worker rules and account controls are grouped clearly instead of scattered through the app.",
    lanes: [["Business", "Name and branding"], ["Rules", "How work behaves"], ["Safety", "Access and control"]],
  },
  plans: {
    eyebrow: "Plan overview",
    title: "See your current access before comparing anything.",
    text: "Plan capacity, included tools and optional add-ons are shown in one straight line with locked pricing.",
    lanes: [["Current", "What you have"], ["Compare", "What each tier adds"], ["Choose", "Only when ready"]],
  },
  support: {
    eyebrow: "Help overview",
    title: "Start with the page, record or decision that is stuck.",
    text: "Help follows the real workflow so you can get moving without searching through generic articles.",
    lanes: [["Where", "The page involved"], ["What", "The record or action"], ["Fix", "The next useful step"]],
  },
};

const ALIASES = {
  dashboard: "today",
  smarthub: "today",
  work: "jobs",
  calendar: "schedule",
  worker: "workers",
  staff: "team",
  integrations: "xero",
  accounting: "xero",
  help: "support",
  guide: "support",
  setup: "support",
};

function cleanKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pageFromLocation() {
  if (typeof window === "undefined") return "today";
  const path = cleanKey((window.location.pathname || "").split("/")[1] || "dashboard");
  const hash = cleanKey((window.location.hash || "").replace(/^#/, "").split("?")[0]);
  return ALIASES[hash] || hash || ALIASES[path] || path || "today";
}

function go(page) {
  const base = window.location.pathname === "/plans" && page === "plans" ? "/plans" : "/dashboard";
  window.history.pushState({}, "", `${base}${page === "today" ? "" : `#${page}`}`);
  window.dispatchEvent(new Event("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function useHost(selector, className, placement = "append") {
  const [host, setHost] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    let node = null;
    let attempts = 0;

    const attach = () => {
      if (cancelled) return;
      const target = document.querySelector(selector);
      if (!target) {
        attempts += 1;
        if (attempts < 40) window.setTimeout(attach, 50);
        return;
      }
      node = document.createElement("div");
      node.className = className;
      if (placement === "prepend") target.prepend(node);
      else target.append(node);
      setHost(node);
    };

    attach();
    return () => {
      cancelled = true;
      if (node?.parentNode) node.parentNode.removeChild(node);
    };
  }, [selector, className, placement]);

  return host;
}

function DirectNav({ page }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef(null);
  const moreActive = MORE_NAV.some((item) => item.id === page);

  React.useEffect(() => {
    const close = (event) => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <nav className="cv6DirectNav" aria-label="Churvox main navigation">
    <div className="cv6CoreLinks">
      {CORE_NAV.map((item) => <button
        type="button"
        key={item.id}
        className={page === item.id ? "active" : ""}
        aria-current={page === item.id ? "page" : undefined}
        onClick={() => go(item.id)}
      ><b>{item.label}</b><small>{item.hint}</small></button>)}
    </div>
    <div className={`cv6More ${moreActive ? "active" : ""}`} ref={moreRef}>
      <button type="button" className="cv6MoreButton" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}>
        <b>More</b><small>{moreActive ? [...MORE_NAV].find((item) => item.id === page)?.label : "Tools and setup"}</small><span aria-hidden="true">⌄</span>
      </button>
      {moreOpen ? <div className="cv6MoreMenu">
        {MORE_NAV.map((item) => <button type="button" key={item.id} className={page === item.id ? "active" : ""} onClick={() => { setMoreOpen(false); go(item.id); }}><span><b>{item.label}</b><small>{item.hint}</small></span><em>Open</em></button>)}
      </div> : null}
    </div>
  </nav>;
}

function PageLens({ page }) {
  const lens = PAGE_LENS[page] || PAGE_LENS.today;
  return <section className={`cv6PageLens page-${page}`} aria-label={`${page} overview`}>
    <div className="cv6LensCopy"><small>{lens.eyebrow}</small><h2>{lens.title}</h2><p>{lens.text}</p></div>
    <div className="cv6LensLanes">
      {lens.lanes.map(([label, text], index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i><small>{label}</small><b>{text}</b></span>)}
    </div>
  </section>;
}

function WorkspaceChrome() {
  const [page, setPage] = React.useState(pageFromLocation);
  const navHost = useHost(".cv3Top", "cv6NavHost", "append");
  const lensHost = useHost(".cv3Workspace", "cv6LensHost", "prepend");

  React.useEffect(() => {
    const sync = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return <>
    {navHost ? createPortal(<DirectNav page={page} />, navHost) : null}
    {lensHost ? createPortal(<PageLens page={page} />, lensHost) : null}
  </>;
}

export default function ProductAppV6() {
  return <div className="cv6Shell" data-version="CHURVOX_CLEAR_VISUAL_WORKSPACE_20260725">
    <ProductAppV3 />
    <WorkspaceChrome />
  </div>;
}
