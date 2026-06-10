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


function ShellPageNormalizer() {
  return (
    <style>{`
      /* CHURVOX_FORCE_CHILD_PAGES_INTO_SHELL_20260610
         Loaded AFTER each page renders, so it beats page-level <style> tags
         and inline page layouts. */

      .cvxShell .cvxShellCanvas > main,
      .cvxShell .cvxShellCanvas main[style],
      .cvxShell .cvxShellCanvas main[class],
      .cvxShell .cvxShellCanvas .cxRoot,
      .cvxShell .cvxShellCanvas .ch4Root,
      .cvxShell .cvxShellCanvas .scRoot,
      .cvxShell .cvxShellCanvas .dwRoot,
      .cvxShell .cvxShellCanvas .concept-c2-frame,
      .cvxShell .cvxShellCanvas .xcf-real-page,
      .cvxShell .cvxShellCanvas .xcf-workspace,
      .cvxShell .cvxShellCanvas .xcf-shell.xcf-real-page {
        position: relative !important;
        inset: auto !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
        bottom: auto !important;
        z-index: auto !important;
        min-height: auto !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        overflow: visible !important;
        box-sizing: border-box !important;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      }

      .cvxShell .cvxShellCanvas main > section,
      .cvxShell .cvxShellCanvas main > div,
      .cvxShell .cvxShellCanvas .cxWrap,
      .cvxShell .cvxShellCanvas .ch4Wrap,
      .cvxShell .cvxShellCanvas .dwWrap,
      .cvxShell .cvxShellCanvas .scWrap,
      .cvxShell .cvxShellCanvas .concept-c2-frame > *,
      .cvxShell .cvxShellCanvas .xcf-workspace > * {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .cvxShell .cvxShellCanvas .cxRoot {
        padding: 0 !important;
      }

      .cvxShell .cvxShellCanvas .cxOverlay {
        padding-left: 18px !important;
      }

      @media (min-width: 1024px) {
        .cvxShell .cvxShellCanvas .cxRoot {
          padding: 0 !important;
        }

        .cvxShell .cvxShellCanvas .cxOverlay {
          padding: 18px !important;
        }
      }

      @media (max-width: 1180px) {
        .cvxShell .cvxShellCanvas main section[style],
        .cvxShell .cvxShellCanvas main div[style] {
          max-width: 100% !important;
        }
      }

      @media (max-width: 900px) {
        .cvxShell .cvxShellCanvas main section[style] {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
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
        <div className="cvxShellCanvas">{children}<ShellPageNormalizer /></div>
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
