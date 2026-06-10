import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./CommandShell.css";

const groups = [
  ["Command", [["Command Board", "/dashboard", "CM"]]],
  ["Work", [["Jobs", "/jobs-board", "JB"], ["Dispatch", "/dispatch-board", "DP"], ["Clients", "/clients-board", "CL"], ["Quotes", "/quotes-board", "QT"], ["Invoices", "/invoices-board", "IV"]]],
  ["Business", [["Team", "/team-board", "TM"], ["Payroll", "/payroll-board", "PR"], ["Reports", "/reports-board", "RP"]]],
  ["System", [["Plans", "/plans", "PL"], ["Settings", "/settings-board", "ST"], ["Support", "/support-board", "SP"]]],
];

const FIT_SCREEN_OVERRIDE = `
  html, body, #root {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  .cvxAppShell,
  .cvxAppShell * {
    box-sizing: border-box !important;
  }

  .cvxAppMain {
    overflow-x: hidden !important;
  }

  .cvxAppMain > main,
  .cvxAppMain > section,
  .cvxAppMain > div {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  @media (min-width: 1024px) {
    .cvxAppSidebar {
      display: block !important;
    }

    .cvxAppMobileNav {
      display: none !important;
    }

    .cvxAppMain {
      width: calc(100vw - var(--cvx-side)) !important;
      max-width: calc(100vw - var(--cvx-side)) !important;
      margin-left: var(--cvx-side) !important;
      padding: 24px clamp(18px, 2.2vw, 34px) 92px !important;
    }

    /* Every board keeps its own page, but obeys the same Command shell canvas. */
    body .cvxAppShell .cvxAppMain .cxRoot,
    body .cvxAppShell .cvxAppMain .ch4Root,
    body .cvxAppShell .cvxAppMain .srRoot,
    body .cvxAppShell .cvxAppMain .ivRoot,
    body .cvxAppShell .cvxAppMain .plRoot,
    body .cvxAppShell .cvxAppMain .stRoot,
    body .cvxAppShell .cvxAppMain .jbRoot,
    body .cvxAppShell .cvxAppMain .clRoot,
    body .cvxAppShell .cvxAppMain .qtRoot,
    body .cvxAppShell .cvxAppMain .tmRoot,
    body .cvxAppShell .cvxAppMain .pyRoot,
    body .cvxAppShell .cvxAppMain .rpRoot,
    body .cvxAppShell .cvxAppMain .dwRoot,
    body .cvxAppShell .cvxAppMain .dbRoot,
    body .cvxAppShell .cvxAppMain .dsRoot,
    body .cvxAppShell .cvxAppMain .jobsClean {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      overflow-x: hidden !important;
      transform: none !important;
    }

    body .cvxAppShell .cvxAppMain .cxWrap,
    body .cvxAppShell .cvxAppMain .ch4Wrap,
    body .cvxAppShell .cvxAppMain .srWrap,
    body .cvxAppShell .cvxAppMain .ivWrap,
    body .cvxAppShell .cvxAppMain .plWrap,
    body .cvxAppShell .cvxAppMain .stWrap,
    body .cvxAppShell .cvxAppMain .jbWrap,
    body .cvxAppShell .cvxAppMain .clWrap,
    body .cvxAppShell .cvxAppMain .qtWrap,
    body .cvxAppShell .cvxAppMain .tmWrap,
    body .cvxAppShell .cvxAppMain .pyWrap,
    body .cvxAppShell .cvxAppMain .rpWrap,
    body .cvxAppShell .cvxAppMain .dwWrap,
    body .cvxAppShell .cvxAppMain .dbWrap,
    body .cvxAppShell .cvxAppMain .dsWrap,
    body .cvxAppShell .cvxAppMain .supportWrap,
    body .cvxAppShell .cvxAppMain .plansWrap,
    body .cvxAppShell .cvxAppMain .jobsCleanWrap {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      transform: none !important;
    }

    body .cvxAppShell .cvxAppMain .cxHero,
    body .cvxAppShell .cvxAppMain .ch4Hero,
    body .cvxAppShell .cvxAppMain .srHero,
    body .cvxAppShell .cvxAppMain .ivHero,
    body .cvxAppShell .cvxAppMain .plHero,
    body .cvxAppShell .cvxAppMain .stHero,
    body .cvxAppShell .cvxAppMain .jbHero,
    body .cvxAppShell .cvxAppMain .clHero,
    body .cvxAppShell .cvxAppMain .qtHero,
    body .cvxAppShell .cvxAppMain .tmHero,
    body .cvxAppShell .cvxAppMain .pyHero,
    body .cvxAppShell .cvxAppMain .rpHero,
    body .cvxAppShell .cvxAppMain .dwHero,
    body .cvxAppShell .cvxAppMain .dbHero,
    body .cvxAppShell .cvxAppMain .dsHero,
    body .cvxAppShell .cvxAppMain .jobsHero,
    body .cvxAppShell .cvxAppMain .plansHero,
    body .cvxAppShell .cvxAppMain .supportHero {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 0 18px !important;
    }

    body .cvxAppShell .cvxAppMain .ch4Grid,
    body .cvxAppShell .cvxAppMain .jbGrid {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      grid-template-columns: minmax(260px, 340px) minmax(0, 1fr) !important;
      gap: 22px !important;
      align-items: start !important;
    }

    body .cvxAppShell .cvxAppMain .srGrid,
    body .cvxAppShell .cvxAppMain .clGrid,
    body .cvxAppShell .cvxAppMain .qtGrid {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr) minmax(260px, 340px) !important;
      gap: 22px !important;
      align-items: start !important;
    }

    body .cvxAppShell .cvxAppMain .ivGrid {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 22px !important;
      align-items: start !important;
    }

    body .cvxAppShell .cvxAppMain .jobsGrid {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 16px !important;
    }

    body .cvxAppShell .cvxAppMain .tmGrid,
    body .cvxAppShell .cvxAppMain .pyGrid,
    body .cvxAppShell .cvxAppMain .rpGrid,
    body .cvxAppShell .cvxAppMain .stGrid,
    body .cvxAppShell .cvxAppMain .plGrid,
    body .cvxAppShell .cvxAppMain .dwGrid,
    body .cvxAppShell .cvxAppMain .dbGrid,
    body .cvxAppShell .cvxAppMain .dsGrid {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
    }

    body .cvxAppShell .cvxAppMain .ivFields {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    body .cvxAppShell .cvxAppMain .ivField.wide,
    body .cvxAppShell .cvxAppMain .ch4Field.wide,
    body .cvxAppShell .cvxAppMain .jbField.wide,
    body .cvxAppShell .cvxAppMain .tmField.wide,
    body .cvxAppShell .cvxAppMain .pyField.wide {
      grid-column: 1 / -1 !important;
    }

    body .cvxAppShell .cvxAppMain .tmPanel,
    body .cvxAppShell .cvxAppMain .pyPanel,
    body .cvxAppShell .cvxAppMain .rpPanel,
    body .cvxAppShell .cvxAppMain .stPanel,
    body .cvxAppShell .cvxAppMain .plPanel,
    body .cvxAppShell .cvxAppMain .dwPanel,
    body .cvxAppShell .cvxAppMain .dbPanel,
    body .cvxAppShell .cvxAppMain .dsPanel,
    body .cvxAppShell .cvxAppMain .ivPanel,
    body .cvxAppShell .cvxAppMain .srPanel,
    body .cvxAppShell .cvxAppMain .clPanel,
    body .cvxAppShell .cvxAppMain .qtPanel,
    body .cvxAppShell .cvxAppMain .ch4Panel,
    body .cvxAppShell .cvxAppMain .jobsPanel {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
    }

    body .cvxAppShell .cvxAppMain form,
    body .cvxAppShell .cvxAppMain .ivFields,
    body .cvxAppShell .cvxAppMain .ch4Fields,
    body .cvxAppShell .cvxAppMain .jbFields,
    body .cvxAppShell .cvxAppMain .tmFields,
    body .cvxAppShell .cvxAppMain .pyFields {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
    }

    body .cvxAppShell .cvxAppMain input,
    body .cvxAppShell .cvxAppMain select,
    body .cvxAppShell .cvxAppMain textarea {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
  }

  @media (max-width: 1023px) {
    .cvxAppMain {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      padding: 14px 12px 94px !important;
    }

    body .cvxAppShell .cvxAppMain .ch4Root,
    body .cvxAppShell .cvxAppMain .srRoot,
    body .cvxAppShell .cvxAppMain .ivRoot,
    body .cvxAppShell .cvxAppMain .tmRoot,
    body .cvxAppShell .cvxAppMain .pyRoot,
    body .cvxAppShell .cvxAppMain .jobsClean {
      padding: 0 !important;
      width: 100% !important;
      max-width: none !important;
    }

    body .cvxAppShell .cvxAppMain .ch4Wrap,
    body .cvxAppShell .cvxAppMain .srWrap,
    body .cvxAppShell .cvxAppMain .ivWrap,
    body .cvxAppShell .cvxAppMain .tmWrap,
    body .cvxAppShell .cvxAppMain .pyWrap,
    body .cvxAppShell .cvxAppMain .jobsCleanWrap {
      padding-left: 0 !important;
      padding-right: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }
  }
`;

function active(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/jobs-board") return pathname.includes("job");
  if (href === "/dispatch-board") return pathname.includes("dispatch") || pathname.includes("crew-map") || pathname.includes("calendar") || pathname.includes("schedule");
  if (href === "/clients-board") return pathname.includes("client");
  if (href === "/quotes-board") return pathname.includes("quote");
  if (href === "/invoices-board") return pathname.includes("invoice");
  if (href === "/team-board") return pathname.includes("team");
  if (href === "/payroll-board") return pathname.includes("payroll");
  if (href === "/reports-board") return pathname.includes("report");
  if (href === "/settings-board") return pathname.includes("setting");
  if (href === "/support-board") return pathname.includes("support");
  return pathname === href;
}

export default function CommandShell({ children }) {
  const { pathname } = useLocation();
  const mobile = groups.flatMap((group) => group[1]).slice(0, 5);

  return (
    <div className="cvxAppShell" data-churvox-shell="command">
      <aside className="cvxAppSidebar" aria-label="Churvox command navigation">
        <Link to="/dashboard" className="cvxAppBrand">
          <b>C</b>
          <span><strong>CHURVOX</strong><small>Command Desk</small></span>
        </Link>
        <nav className="cvxAppNav">
          {groups.map(([group, items]) => (
            <section key={group}>
              <p>{group}</p>
              {items.map(([label, href, icon]) => (
                <Link key={href} to={href} className={active(pathname, href) ? "active" : ""}>
                  <i>{icon}</i><span>{label}</span>
                </Link>
              ))}
            </section>
          ))}
        </nav>
      </aside>
      <main className="cvxAppMain" data-command-canvas="true">{children}</main>
      <style>{FIT_SCREEN_OVERRIDE}</style>
      <nav className="cvxAppMobileNav" aria-label="Churvox mobile command navigation">
        {mobile.map(([label, href, icon]) => (
          <Link key={href} to={href} className={active(pathname, href) ? "active" : ""}>
            <i>{icon}</i><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
