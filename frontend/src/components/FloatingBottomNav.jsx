import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ChurvoxHelpWidget from "./ChurvoxHelpWidget";
import "./FloatingBottomNav.css";
import "./IndustrialCommandSidebar.css";
import "./IndustrialCommandPages.css";
import "./DashboardStripClean.css";

const NAV_ITEMS = [
  ["Command Board", "/dashboard", "CB"],
  ["Jobs", "/jobs", "JB"],
  ["Assign Jobs", "/dispatch", "AS"],
  ["Clients", "/clients", "CL"],
  ["Quotes", "/quotes", "QT"],
  ["Invoices", "/invoices", "IV"],
  ["Team", "/team", "TM"],
  ["Plans", "/plans", "PL"],
  ["Settings", "/settings", "ST"],
];

const INDUSTRIAL_GROUPS = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "AS"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const COMMAND_PATHS = ["/dashboard", "/overview", "/notifications", "/jobs", "/dispatch", "/dispatch-board", "/crew-map", "/clients", "/quotes", "/invoices", "/team", "/payroll", "/reports", "/plans", "/settings", "/support"];

function isCommandPath(pathname) {
  return COMMAND_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/crew-map") return pathname === "/crew-map";
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/team") return pathname === "/team" || pathname.startsWith("/team/");
  if (href === "/plans") return pathname === "/plans";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IndustrialSidebar({ pathname }) {
  return (
    <aside className="cv-industrial-sidebar" aria-label="Churvox command navigation">
      <div className="cv-industrial-rail" />
      <div className="cv-industrial-brand">
        <div className="cv-industrial-mark">C</div>
        <div>
          <strong>CHURVOX</strong>
          <span>Command Desk</span>
        </div>
      </div>

      <div className="cv-industrial-status">
        <span>Command Desk</span>
        <b>Owner approval live</b>
      </div>

      <div className="cv-industrial-navwrap">
        {INDUSTRIAL_GROUPS.map((group) => (
          <section key={group.title} className="cv-industrial-group">
            <p>{group.title}</p>
            <nav>
              {group.items.map(([label, href, icon]) => {
                const active = isActive(pathname, href);
                return (
                  <Link key={href} to={href} className={active ? "active" : ""}>
                    <i>{icon}</i>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

export default function FloatingBottomNav() {
  const { pathname } = useLocation();
  const commandVisible = isCommandPath(pathname);

  useEffect(() => {
    document.body.classList.toggle("cv-has-floating-dock", commandVisible);
    document.body.classList.toggle("cv-industrial-shell", commandVisible);
    return () => {
      document.body.classList.remove("cv-has-floating-dock");
      document.body.classList.remove("cv-industrial-shell");
    };
  }, [commandVisible]);

  if (!commandVisible) return <ChurvoxHelpWidget />;

  return (
    <>
      <IndustrialSidebar pathname={pathname} />
      <nav className="cv-clean-command-nav" aria-label="Churvox mobile command navigation">
        {NAV_ITEMS.map(([label, href, icon]) => (
          <Link key={href} to={href} className={isActive(pathname, href) ? "active" : ""}>
            <i aria-hidden="true">{icon}</i>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <ChurvoxHelpWidget />
    </>
  );
}
