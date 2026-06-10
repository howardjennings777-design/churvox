import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./CommandShell.css";

const groups = [
  ["Command", [["Command Board", "/dashboard", "CM"]]],
  ["Work", [["Jobs", "/jobs-board", "JB"], ["Dispatch", "/dispatch-board", "DP"], ["Clients", "/clients-board", "CL"], ["Quotes", "/quotes-board", "QT"], ["Invoices", "/invoices-board", "IV"]]],
  ["Business", [["Team", "/team-board", "TM"], ["Payroll", "/payroll-board", "PR"], ["Reports", "/reports-board", "RP"]]],
  ["System", [["Plans", "/plans", "PL"], ["Settings", "/settings-board", "ST"], ["Support", "/support-board", "SP"]]],
];

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
