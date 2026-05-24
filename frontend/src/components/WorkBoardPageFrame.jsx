import React from "react";
import "./workBoardPageFrame.css";

const PAGE_META = [
  { match: "clients", area: "CUSTOMERS", title: "Customer board", subtitle: "Clients, contacts, addresses and follow-ups stay in one work surface.", stats: ["Client records", "Follow-ups", "Service history"] },
  { match: "jobs", area: "FIELD WORK", title: "Job board", subtitle: "Create, assign, track and finish work without leaving the board.", stats: ["Needs fixing", "Today’s work", "Ready to bill"] },
  { match: "dispatch", area: "SCHEDULE", title: "Dispatch board", subtitle: "Schedule, crews and field work stay clear on one surface.", stats: ["Crew", "Today", "Conflicts"] },
  { match: "invoices", area: "MONEY", title: "Invoice board", subtitle: "See what is ready to bill, what is waiting, and what needs chasing.", stats: ["Drafts", "Sent invoices", "Money owing"] },
  { match: "quotes", area: "SALES", title: "Quote board", subtitle: "Quotes waiting, follow-ups due, and work ready to turn into jobs.", stats: ["Draft quotes", "Follow-ups", "Accepted work"] },
  { match: "team", area: "CREW", title: "Crew board", subtitle: "Workers, roles, assignments and access all in one place.", stats: ["Workers", "Roles", "Invites"] },
  { match: "settings", area: "CONTROL", title: "Settings board", subtitle: "Business setup, account control and owner preferences.", stats: ["Business", "Access", "Controls"] },
  { match: "plans", area: "PLAN", title: "Plan board", subtitle: "Plan, limits, billing and upgrade controls.", stats: ["Current plan", "Limits", "Billing"] },
  { match: "reports", area: "REPORTS", title: "Reports board", subtitle: "Money, jobs, payroll and business records ready to review.", stats: ["Money", "Jobs", "Exports"] },
  { match: "payroll", area: "PAYROLL", title: "Payroll board", subtitle: "Approved hours, worker summaries and payroll handoff.", stats: ["Hours", "Workers", "Exports"] },
  { match: "automation", area: "AUTOMATION", title: "Automation board", subtitle: "Rules, triggers and admin actions Churvox can prepare for you.", stats: ["Rules", "Runs", "Approvals"] },
  { match: "sms", area: "MESSAGES", title: "Message board", subtitle: "Customer reminders, SMS credits and message history.", stats: ["Credits", "Reminders", "History"] },
  { match: "integrations", area: "SYNC", title: "Integrations board", subtitle: "MYOB, accounting sync and connected business tools.", stats: ["Sync", "Invoices", "Payments"] },
  { match: "notifications", area: "ALERTS", title: "Notifications board", subtitle: "Important updates, approvals and work changes in one feed.", stats: ["Unread", "Updates", "History"] },
  { match: "contact", area: "SUPPORT", title: "Contact board", subtitle: "Questions, support and business help.", stats: ["Support", "Help", "Contact"] },
];

function getMeta(pathname) {
  const clean = String(pathname || "").toLowerCase();
  return PAGE_META.find((item) => clean.includes(item.match)) || {
    area: "WORK BOARD",
    title: "Churvox work surface",
    subtitle: "Everything sits inside the same command-board system.",
    stats: ["Work", "Admin", "Money"],
  };
}

function shouldBypass(pathname) {
  const path = String(pathname || "").toLowerCase();
  return path === "/" || path.includes("/dashboard") || path.includes("/overview") || path.includes("/login") || path.includes("/signup") || path.includes("/reset") || path.includes("/forgot") || path.includes("/invite") || path.includes("/public") || path.includes("/client-portal") || path.includes("/features") || path.includes("/pricing") || path.includes("/privacy") || path.includes("/terms") || path.includes("/account-deletion") || path.includes("/platform-unlock") || path.includes("/admin") || path.includes("/worker");
}

function usePathname() {
  const getPath = () => window.location.pathname || "/";
  const [path, setPath] = React.useState(getPath);

  React.useEffect(() => {
    const update = () => setPath(getPath());
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      const result = originalPush.apply(this, args);
      update();
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplace.apply(this, args);
      update();
      return result;
    };

    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  return path;
}

export default function WorkBoardPageFrame({ children }) {
  const pathname = usePathname();

  if (shouldBypass(pathname)) return <>{children}</>;

  const meta = getMeta(pathname);

  return (
    <div className="cvx-work-frame" data-version="CHURVOX_REAL_FULL_APP_WORK_BOARD_FRAME_20260524">
      <header className="cvx-work-frame__top">
        <div className="cvx-work-frame__title">
          <p>{meta.area}</p>
          <h1>{meta.title}</h1>
          <span>{meta.subtitle}</span>
        </div>

        <div className="cvx-work-frame__signals">
          {meta.stats.map((stat) => <button key={stat} type="button">{stat}</button>)}
        </div>

        <div className="cvx-work-frame__actions">
          <a href="/dashboard">Work Board</a>
          <a href="/jobs">Jobs</a>
          <a href="/invoices">Money</a>
        </div>
      </header>

      <section className="cvx-work-frame__belt" aria-label="Work board lanes">
        <button type="button"><span>Needs approval</span><strong>Owner review first</strong></button>
        <button type="button"><span>Needs fixing</span><strong>Missing or blocked work</strong></button>
        <button type="button"><span>Money</span><strong>Bill and chase payment</strong></button>
        <button type="button"><span>AI operator</span><strong>Churvox prepares, you approve</strong></button>
      </section>

      <main className="cvx-work-frame__surface">
        {children}
      </main>
    </div>
  );
}
