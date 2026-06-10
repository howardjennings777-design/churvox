import React from "react";
import "./v2-shell.css";

const navGroups = [
  {
    label: "Command",
    links: [{ key: "command", label: "Command Board", href: "/dashboard", icon: "CM" }],
  },
  {
    label: "Work",
    links: [
      { key: "jobs", label: "Jobs", href: "/jobs-board", icon: "JB" },
      { key: "dispatch", label: "Dispatch", href: "/dispatch-board", icon: "DP" },
      { key: "clients", label: "Clients", href: "/clients-board", icon: "CL" },
      { key: "quotes", label: "Quotes", href: "/quotes-board", icon: "QT" },
      { key: "invoices", label: "Invoices", href: "/invoices-board", icon: "IV" },
    ],
  },
  {
    label: "Business",
    links: [
      { key: "team", label: "Team", href: "/team-board", icon: "TM" },
      { key: "payroll", label: "Payroll", href: "/payroll-board", icon: "PR" },
      { key: "reports", label: "Reports", href: "/reports-board", icon: "RP" },
    ],
  },
  {
    label: "System",
    links: [
      { key: "plans", label: "Plans", href: "/plans", icon: "PL" },
      { key: "settings", label: "Settings", href: "/settings-board", icon: "ST" },
      { key: "support", label: "Support", href: "/support-board", icon: "SP" },
    ],
  },
];

export default function V2Shell({ active = "clients", children }) {
  return (
    <div className="v2StandaloneShell">
      <aside className="v2StandaloneSidebar" aria-label="Churvox navigation">
        <a className="v2StandaloneBrand" href="/dashboard">
          <b>C</b>
          <span>
            <strong>CHURVOX</strong>
            <small>Clean V2</small>
          </span>
        </a>
        <nav className="v2StandaloneNav">
          {navGroups.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              {group.links.map((link) => (
                <a key={link.key} className={active === link.key ? "active" : ""} href={link.href}>
                  <i>{link.icon}</i>
                  <span>{link.label}</span>
                </a>
              ))}
            </section>
          ))}
        </nav>
      </aside>
      <main className="v2StandaloneMain">{children}</main>
      <nav className="v2StandaloneMobileNav" aria-label="Mobile Churvox navigation">
        {navGroups[1].links.map((link) => (
          <a key={link.key} className={active === link.key ? "active" : ""} href={link.href}>
            <i>{link.icon}</i>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
