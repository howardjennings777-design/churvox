import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  ["Command Board", "/dashboard", "CM", "Command"],
  ["Jobs", "/jobs-board", "JB", "Work"],
  ["Crew Dispatch", "/dispatch-board", "DP", "Work"],
  ["Clients", "/clients-board", "CL", "Work"],
  ["Quotes", "/quotes-board", "QT", "Work"],
  ["Invoices", "/invoices-board", "IV", "Work"],
  ["Team", "/team-board", "TM", "Crew & Admin"],
  ["Payroll", "/payroll-board", "PR", "Crew & Admin"],
  ["Reports", "/reports-board", "RP", "Crew & Admin"],
  ["Plans", "/plans", "PL", "System"],
  ["Settings", "/settings-board", "ST", "System"],
  ["Support", "/support-board", "?", "System"],
];

const COMMAND_PATHS = [
  "/dashboard", "/overview",
  "/jobs-board", "/jobs",
  "/dispatch-board", "/dispatch", "/crew-map",
  "/clients-board", "/clients",
  "/quotes-board", "/quotes",
  "/invoices-board", "/invoices",
  "/team-board", "/team",
  "/payroll-board", "/payroll",
  "/reports-board", "/reports",
  "/plans",
  "/settings-board", "/settings",
  "/support-board", "/support",
];

function isCommandPath(pathname) {
  return COMMAND_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/jobs-board") return pathname === "/jobs-board" || pathname === "/jobs" || pathname.startsWith("/jobs/");
  if (href === "/dispatch-board") return pathname === "/dispatch-board" || pathname === "/dispatch" || pathname === "/crew-map";
  if (href === "/clients-board") return pathname === "/clients-board" || pathname === "/clients" || pathname.startsWith("/clients/");
  if (href === "/quotes-board") return pathname === "/quotes-board" || pathname === "/quotes" || pathname.startsWith("/quotes/");
  if (href === "/invoices-board") return pathname === "/invoices-board" || pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/team-board") return pathname === "/team-board" || pathname === "/team" || pathname.startsWith("/team/");
  if (href === "/payroll-board") return pathname === "/payroll-board" || pathname === "/payroll" || pathname.startsWith("/payroll/");
  if (href === "/reports-board") return pathname === "/reports-board" || pathname === "/reports" || pathname.startsWith("/reports/");
  if (href === "/settings-board") return pathname === "/settings-board" || pathname === "/settings" || pathname.startsWith("/settings/");
  if (href === "/support-board") return pathname === "/support-board" || pathname === "/support" || pathname.startsWith("/support/");
  if (href === "/plans") return pathname === "/plans";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupItems() {
  return NAV_ITEMS.reduce((groups, item) => {
    const group = item[3];
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
}

function FreshSidebar({ pathname }) {
  const groups = groupItems();

  return (
    <aside className="cvxSide" aria-label="Churvox command navigation">
      <div className="cvxRail" />

      <div className="cvxBrand">
        <div className="cvxLogo">C</div>
        <div>
          <strong>CHURVOX</strong>
          <span>Command Desk</span>
        </div>
      </div>

      <div className="cvxStatus">
        <span>AI Operator</span>
        <b>Prepared admin. You approve.</b>
      </div>

      <div className="cvxScroll">
        {Object.entries(groups).map(([title, items]) => (
          <section key={title} className="cvxGroup">
            <p>{title}</p>
            <nav>
              {items.map(([label, href, icon]) => {
                const active = isActive(pathname, href);
                return (
                  <Link key={href} to={href} className={active ? "cvxActive" : ""}>
                    <i aria-hidden="true">{icon}</i>
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

function FreshMobileNav({ pathname }) {
  return (
    <nav className="cvxMobileNav" aria-label="Churvox mobile command navigation">
      {NAV_ITEMS.map(([label, href, icon]) => (
        <Link key={href} to={href} className={isActive(pathname, href) ? "cvxActive" : ""}>
          <i aria-hidden="true">{icon}</i>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function FloatingBottomNav() {
  const { pathname } = useLocation();
  const commandVisible = isCommandPath(pathname);

  useEffect(() => {
    document.body.classList.toggle("cvx-command-shell", commandVisible);
    document.body.classList.toggle("cv-industrial-shell", commandVisible);

    return () => {
      document.body.classList.remove("cvx-command-shell");
      document.body.classList.remove("cv-industrial-shell");
    };
  }, [commandVisible]);

  if (!commandVisible) return null;

  return (
    <>
      <FreshSidebar pathname={pathname} />
      <FreshMobileNav pathname={pathname} />
    </>
  );
}
