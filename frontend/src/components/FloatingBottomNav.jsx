import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./FloatingBottomNav.css";

// CHURVOX_CLEAN_FLOATING_COMMAND_NAV_20260601
const NAV_ITEMS = [
  ["Command", "/dashboard", "⌘"],
  ["Setup", "/onboarding", "✓"],
  ["Jobs", "/jobs", "▦"],
  ["Dispatch", "/dispatch", "⇄"],
  ["Clients", "/clients", "●"],
  ["Quotes", "/quotes", "✎"],
  ["Money", "/invoices", "$"],
  ["Crew", "/team", "👥"],
  ["More", "/operator-tools", "+"],
];

const COMMAND_PATHS = [
  "/onboarding",
  "/jobs",
  "/dispatch",
  "/clients",
  "/quotes",
  "/invoices",
  "/team",
  "/automation",
  "/integrations",
  "/reports",
  "/notifications",
  "/settings",
  "/operator-tools",
  "/demo-mode",
  "/billing-confidence",
  "/sales-polish",
  "/integration-proof",
  "/launch-ops",
  "/backup-recovery",
  "/polish-checklist",
  "/money-desk",
  "/money",
  "/pipeline",
  "/crew-ops",
];

function isCommandPath(pathname) {
  return COMMAND_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/") || pathname === "/money" || pathname === "/money-desk";
  if (href === "/team") return pathname === "/team" || pathname.startsWith("/team/") || pathname === "/crew-ops";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function FloatingBottomNav() {
  const { pathname } = useLocation();

  // Dashboard and Plans now have their own premium side navigation. Keep the floating dock off them.
  const hasOwnSideNav = pathname === "/dashboard" || pathname === "/overview" || pathname === "/plans";
  const visible = !hasOwnSideNav && isCommandPath(pathname);

  useEffect(() => {
    document.body.classList.toggle("cv-has-floating-dock", visible);
    return () => document.body.classList.remove("cv-has-floating-dock");
  }, [visible]);

  if (!visible) return null;

  return (
    <nav className="cv-clean-command-nav" aria-label="Churvox command navigation">
      {NAV_ITEMS.map(([label, href, icon]) => (
        <Link key={href} to={href} className={isActive(pathname, href) ? "active" : ""}>
          <i aria-hidden="true">{icon}</i>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
