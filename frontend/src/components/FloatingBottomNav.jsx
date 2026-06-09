import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ChurvoxHelpWidget from "./ChurvoxHelpWidget";
import "./FloatingBottomNav.css";
import "./IndustrialCommandSidebar.css";
import "./IndustrialCommandPages.css";
import "./ChurvoxLaunchCleanup.css";

const BUILD_MARKER = "Build direct-workbench-sidebar-clear";

const COMMAND_SHELL_STYLE = `
  @media (min-width: 1201px) {
    body.cv-industrial-shell .cxRoot,
    body.cv-industrial-shell .ch4Root {
      padding-left: 270px !important;
    }
    body.cv-industrial-shell .scRoot,
    body.cv-industrial-shell .dwRoot {
      padding-left: 310px !important;
      padding-right: 24px !important;
    }
    body.cv-industrial-shell .cxWrap,
    body.cv-industrial-shell .ch4Wrap,
    body.cv-industrial-shell .dwWrap {
      max-width: 1520px !important;
      margin: 0 auto !important;
      padding-left: 24px !important;
      padding-right: 24px !important;
    }
  }
  @media (max-width: 1200px) {
    body.cv-industrial-shell .cxRoot,
    body.cv-industrial-shell .ch4Root,
    body.cv-industrial-shell .scRoot,
    body.cv-industrial-shell .dwRoot {
      padding-left: 0 !important;
    }
  }

  body.cv-industrial-shell .cv-industrial-group p {
    background: transparent !important;
    color: #94a3b8 !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  body.cv-industrial-shell .cv-industrial-group a.active,
  body.cv-industrial-shell .cv-industrial-group a:hover {
    background: linear-gradient(135deg, #facc15, #fb923c) !important;
    color: #020617 !important;
    border-color: rgba(251, 146, 60, .65) !important;
  }

  body.cv-industrial-shell .cv-industrial-rail,
  body.cv-industrial-shell .cv-industrial-mark {
    background: linear-gradient(135deg, #facc15, #fb923c) !important;
  }

  /* HARD SIDEBAR TEXT FIX - sidebar component owns its own styles */
  body.cv-industrial-shell .cv-industrial-sidebar,
  body.cv-industrial-shell .cv-industrial-sidebar *,
  body.cv-industrial-shell .cv-clean-command-nav,
  body.cv-industrial-shell .cv-clean-command-nav * {
    color: #f8fafc !important;
    -webkit-text-fill-color: #f8fafc !important;
    opacity: 1 !important;
    text-shadow: none !important;
    mix-blend-mode: normal !important;
  }

  body.cv-industrial-shell .cv-industrial-group p {
    color: #94a3b8 !important;
    -webkit-text-fill-color: #94a3b8 !important;
  }

  body.cv-industrial-shell .cv-industrial-group a i,
  body.cv-industrial-shell .cv-clean-command-nav a i {
    color: #facc15 !important;
    -webkit-text-fill-color: #facc15 !important;
  }

  body.cv-industrial-shell .cv-industrial-group a.active,
  body.cv-industrial-shell .cv-industrial-group a.active *,
  body.cv-industrial-shell .cv-industrial-group a:hover,
  body.cv-industrial-shell .cv-industrial-group a:hover *,
  body.cv-industrial-shell .cv-clean-command-nav a.active,
  body.cv-industrial-shell .cv-clean-command-nav a.active * {
    color: #020617 !important;
    -webkit-text-fill-color: #020617 !important;
  }

  body.cv-industrial-shell .cv-industrial-mark {
    color: #020617 !important;
    -webkit-text-fill-color: #020617 !important;
  }

`;

const NAV_ITEMS = [
  ["Command", "/dashboard", "CM"],
  ["Jobs", "/jobs-board", "JB"],
  ["Dispatch", "/dispatch-board", "DP"],
  ["Clients", "/clients-board", "CL"],
  ["Quotes", "/quotes-board", "QT"],
  ["Invoices", "/invoices-board", "IV"],
  ["Team", "/team-board", "TM"],
  ["Plans", "/plans", "PL"],
  ["Settings", "/settings-board", "ST"],
];

const INDUSTRIAL_GROUPS = [
  { title: "Command", items: [["Command Board", "/dashboard", "CM"]] },
  { title: "Work", items: [["Jobs", "/jobs-board", "JB"], ["Crew Dispatch", "/dispatch-board", "DP"], ["Clients", "/clients-board", "CL"], ["Quotes", "/quotes-board", "QT"], ["Invoices", "/invoices-board", "IV"]] },
  { title: "Crew & Admin", items: [["Team", "/team-board", "TM"], ["Payroll", "/payroll-board", "PR"], ["Reports", "/reports-board", "RP"]] },
  { title: "System", items: [["Plans", "/plans", "PL"], ["Settings", "/settings-board", "ST"], ["Support", "/support-board", "?"]] },
];

const COMMAND_PATHS = ["/dashboard", "/overview", "/jobs-board", "/jobs", "/dispatch-board", "/dispatch", "/crew-map", "/clients-board", "/clients", "/quotes-board", "/quotes", "/invoices-board", "/invoices", "/team-board", "/team", "/payroll-board", "/payroll", "/reports-board", "/reports", "/plans", "/settings-board", "/settings", "/support-board", "/support"];

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
        <span>AI Operator</span>
        <b>Prepared admin. You approve.</b>
      </div>
      <div className="cv-industrial-navwrap">
        {INDUSTRIAL_GROUPS.map((group) => (
          <section key={group.title} className="cv-industrial-group">
            <p>{group.title}</p>
            <nav>
              {group.items.map(([label, href, icon]) => {
                const active = isActive(pathname, href);
                return <Link key={href} to={href} className={active ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>;
              })}
            </nav>
          </section>
        ))}
        <div className="cv-industrial-build-marker" title="Temporary live build proof">{BUILD_MARKER}</div>
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
  return <><style>{COMMAND_SHELL_STYLE}</style><IndustrialSidebar pathname={pathname} /><nav className="cv-clean-command-nav" aria-label="Churvox mobile command navigation">{NAV_ITEMS.map(([label, href, icon]) => <Link key={href} to={href} className={isActive(pathname, href) ? "active" : ""}><i aria-hidden="true">{icon}</i><span>{label}</span></Link>)}</nav><ChurvoxHelpWidget /></>;
}
