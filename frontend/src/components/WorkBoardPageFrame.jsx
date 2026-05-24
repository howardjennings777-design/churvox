import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../workboard/workBoardSystem.css";

const EXACT_BOARD_ROUTES = new Set([
  "/jobs",
  "/clients",
  "/invoices",
  "/quotes",
  "/team",
  "/settings",
  "/reports",
  "/payroll",
  "/automation",
  "/automation/runs",
  "/sms",
  "/integrations",
  "/notifications",
  "/dispatch",
]);

const META = [
  ["jobs", "FIELD WORK", "Job workspace", "Create, edit, assign and finish work."],
  ["clients", "CUSTOMERS", "Customer workspace", "Client records, contacts, addresses and history."],
  ["invoices", "MONEY", "Invoice workspace", "Draft, send, chase and review invoices."],
  ["quotes", "SALES", "Quote workspace", "Prepare quotes, follow up and turn accepted work into jobs."],
  ["team", "CREW", "Crew workspace", "Workers, invites, roles and workload."],
  ["settings", "CONTROL", "Settings workspace", "Business setup, controls and preferences."],
  ["reports", "REPORTS", "Reports workspace", "Business, job and money records."],
  ["payroll", "PAYROLL", "Payroll workspace", "Approved hours, worker summaries and handoff."],
  ["automation", "AUTOMATION", "Automation workspace", "Rules, runs and prepared admin actions."],
  ["sms", "MESSAGES", "Message workspace", "Customer reminders, SMS credits and history."],
  ["integrations", "SYNC", "Integration workspace", "MYOB and connected tools."],
  ["notifications", "ALERTS", "Notification workspace", "Updates, approvals and important changes."],
  ["dispatch", "SCHEDULE", "Dispatch workspace", "Crew, jobs and field movement."],
];

function metaFor(pathname) {
  const clean = String(pathname || "").toLowerCase();
  return META.find(([key]) => clean.includes(key)) || ["work", "WORK BOARD", "Work workspace", "Run this area from the same Churvox board system."];
}

function shouldBypass(pathname) {
  const path = String(pathname || "").toLowerCase();
  return (
    path === "/" ||
    path === "/dashboard" ||
    path === "/overview" ||
    EXACT_BOARD_ROUTES.has(path) ||
    path.includes("/login") ||
    path.includes("/signup") ||
    path.includes("/reset") ||
    path.includes("/forgot") ||
    path.includes("/invite") ||
    path.includes("/public") ||
    path.includes("/client-portal") ||
    path.includes("/features") ||
    path.includes("/pricing") ||
    path.includes("/privacy") ||
    path.includes("/terms") ||
    path.includes("/account-deletion") ||
    path.includes("/platform-unlock") ||
    path.includes("/admin") ||
    path.includes("/worker")
  );
}

export default function WorkBoardPageFrame({ children }) {
  const location = useLocation();
  const pathname = location.pathname || "/";

  if (shouldBypass(pathname)) {
    return <>{children}</>;
  }

  const [, area, title, subtitle] = metaFor(pathname);

  return (
    <div className="wbs-frame" data-version="CHURVOX_WORK_BOARD_DETAIL_FRAME_20260524">
      <header className="wbs-frame-top">
        <div>
          <p>{area}</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>

        <nav>
          <Link to="/dashboard">Main board</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/invoices">Money</Link>
        </nav>
      </header>

      <main className="wbs-frame-surface">
        {children}
      </main>
    </div>
  );
}
