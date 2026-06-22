import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  ["Command Board", "/command-board", "CM", "Command"],
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
  ["Support", "/support-board", "SP", "System"],
];

const MOBILE_NAV_ITEMS = [
  ["Command", "/command-board", "CM"],
  ["Jobs", "/jobs-board", "JB"],
  ["Dispatch", "/dispatch-board", "DP"],
  ["Invoices", "/invoices-board", "$"],
  ["Support", "/support-board", "SP"],
];

const COMMAND_PATHS = [
  "/command-board", "/dashboard", "/overview",
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
  if (href === "/command-board") return pathname === "/command-board";
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

function ChurvoxSidebar() {
  return null;
}

function ChurvoxMobileNav({ pathname }) {
  return (
    <nav className="cvxMobileNav" aria-label="Churvox mobile command navigation">
      {MOBILE_NAV_ITEMS.map(([label, href, icon]) => (
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
    document.body.classList.remove("cv-industrial-shell");

    return () => {
      document.body.classList.remove("cvx-command-shell");
      document.body.classList.remove("cv-industrial-shell");
    };
  }, [commandVisible]);

  if (!commandVisible) return null;

  return (
    <>
      <ChurvoxSidebar />
      <ChurvoxMobileNav pathname={pathname} />
    </>
  );
}
