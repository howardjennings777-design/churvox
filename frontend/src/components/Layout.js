import React from "react";
import { NavLink } from "react-router-dom";
import { InstallPrompt } from "./InstallPrompt";
import { ChurvoxLogo } from "./ChurvoxLogo";

const nav = [
  ["/dashboard", "Command"],
  ["/jobs", "Jobs"],
  ["/clients", "Clients"],
  ["/quotes", "Quotes"],
  ["/invoices", "Invoices"],
  ["/team", "Team"],
  ["/payroll", "Payroll"],
  ["/automation", "Automation"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

export default function Layout({ children }) {
  return (
    <div className="wh-app" data-testid="layout-container">
      <header className="wh-app-top">
        <NavLink to="/dashboard" className="wh-app-logo">
          <ChurvoxLogo />
          <span>
            <b>Churvox</b>
            <small>Workhorse Command</small>
          </span>
        </NavLink>

        <nav className="wh-app-nav">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? "is-active" : ""}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="wh-app-main" data-testid="main-content-area">
        {children}
      </main>

      <InstallPrompt />
    </div>
  );
}
