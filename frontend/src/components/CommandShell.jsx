import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./CommandShell.css";

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

function groups() {
  return NAV_ITEMS.reduce((acc, item) => {
    const group = item[3];
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {});
}

export default function CommandShell({ children }) {
  const { pathname } = useLocation();
  const grouped = groups();

  return (
    <div className="cvxShell">
      <aside className="cvxShellSide" aria-label="Churvox navigation">
        <div className="cvxShellBrand">
          <div className="cvxShellLogo">C</div>
          <div>
            <strong>CHURVOX</strong>
            <span>Command Desk</span>
          </div>
        </div>

        <div className="cvxShellNav">
          {Object.entries(grouped).map(([title, items]) => (
            <section key={title} className="cvxShellGroup">
              <p>{title}</p>
              <nav>
                {items.map(([label, href, icon]) => (
                  <Link key={href} to={href} className={isActive(pathname, href) ? "active" : ""}>
                    <i>{icon}</i>
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>
      </aside>

      <main className="cvxShellMain">
        <div className="cvxShellCanvas">{children}</div>
      </main>

      <nav className="cvxShellMobileNav" aria-label="Churvox mobile navigation">
        {NAV_ITEMS.map(([label, href, icon]) => (
          <Link key={href} to={href} className={isActive(pathname, href) ? "active" : ""}>
            <i>{icon}</i>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
