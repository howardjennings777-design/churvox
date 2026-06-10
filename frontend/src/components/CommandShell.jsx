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
  @media (min-width: 1024px) {
    .cvxAppMain {
      width: calc(100vw - var(--cvx-side)) !important;
      max-width: calc(100vw - var(--cvx-side)) !important;
      padding: 24px clamp(18px, 2.2vw, 34px) 92px !important;
    }

    .cvxAppMain > main,
    .cvxAppMain > section,
    .cvxAppMain > div,
    .cvxAppMain :where(
      .cxRoot,.ch4Root,.srRoot,.ivRoot,.plRoot,.stRoot,.jbRoot,.clRoot,.qtRoot,.tmRoot,.pyRoot,.rpRoot,.dwRoot,.dbRoot,.dsRoot,.jobsClean,
      [class$="Root"],[class*="Root "]
    ),
    .cvxAppMain :where(
      .cxWrap,.ch4Wrap,.srWrap,.ivWrap,.plWrap,.stWrap,.jbWrap,.clWrap,.qtWrap,.tmWrap,.pyWrap,.rpWrap,.dwWrap,.dbWrap,.dsWrap,.jobsCleanWrap,
      [class$="Wrap"],[class*="Wrap "]
    ) {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      transform: none !important;
    }

    .cvxAppMain :where(
      .cxHero,.ch4Hero,.srHero,.ivHero,.plHero,.stHero,.jbHero,.clHero,.qtHero,.tmHero,.pyHero,.rpHero,.dwHero,.dbHero,.dsHero,.jobsHero,
      [class$="Hero"],[class*="Hero "]
    ) {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    .cvxAppMain :where(.ch4Grid,.jbGrid) {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      grid-template-columns: minmax(230px, 330px) minmax(0, 1fr) !important;
      gap: 22px !important;
      align-items: start !important;
    }

    .cvxAppMain :where(.ivGrid,.srGrid,.clGrid,.qtGrid) {
      display: grid !important;
      width: 100% !important;
      max-width: none !important;
      grid-template-columns: minmax(260px, 330px) minmax(0, 1fr) minmax(240px, 320px) !important;
      gap: 22px !important;
      align-items: start !important;
    }

    .cvxAppMain :where(.tmGrid,.pyGrid,.rpGrid,.stGrid,.plGrid,.dwGrid,.dbGrid,.dsGrid) {
      width: 100% !important;
      max-width: none !important;
    }

    .cvxAppMain :where(.tmPanel,.pyPanel,.rpPanel,.stPanel,.plPanel,.dwPanel,.dbPanel,.dsPanel,.ivPanel,.srPanel,.clPanel,.qtPanel,.ch4Panel,.jobsPanel,[class$="Panel"],[class*="Panel "]) {
      max-width: none !important;
      min-width: 0 !important;
    }

    .cvxAppMain :where(form,.ivFields,.ch4Fields,.jbFields,.tmFields,.pyFields,[class$="Fields"],[class*="Fields "]) {
      width: 100% !important;
      max-width: none !important;
    }

    .cvxAppMain :where(input, select, textarea) {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
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
