import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./CommandShell.css";

const NAV_ITEMS = [
  ["Command Board", "/dashboard", "CM", "Command"],
  ["Jobs", "/jobs-board", "JB", "Work"],
  ["Dispatch", "/dispatch-board", "DP", "Work"],
  ["Clients", "/clients-board", "CL", "Work"],
  ["Quotes", "/quotes-board", "QT", "Work"],
  ["Invoices", "/invoices-board", "IV", "Work"],
  ["Team", "/team-board", "TM", "Admin"],
  ["Payroll", "/payroll-board", "PR", "Admin"],
  ["Reports", "/reports-board", "RP", "Admin"],
  ["Plans", "/plans", "PL", "System"],
  ["Settings", "/settings-board", "ST", "System"],
  ["Support", "/support-board", "?", "System"],
];

function active(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/jobs-board") return pathname.includes("job");
  if (href === "/dispatch-board") return pathname.includes("dispatch") || pathname.includes("crew-map");
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

function groupedItems() {
  return NAV_ITEMS.reduce((acc, item) => {
    const group = item[3];
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {});
}

export default function CommandShell({ children }) {
  const { pathname } = useLocation();
  const groups = groupedItems();

  return (
    <div className="cvxShell">
      <aside className="cvxSide">
        <div className="cvxBrand">
          <div className="cvxLogo">C</div>
          <div>
            <strong>CHURVOX</strong>
            <span>Command Desk</span>
          </div>
        </div>

        <div className="cvxNav">
          {Object.entries(groups).map(([group, items]) => (
            <section key={group}>
              <p>{group}</p>
              {items.map(([label, href, icon]) => (
                <Link key={href} to={href} className={active(pathname, href) ? "active" : ""}>
                  <i>{icon}</i>
                  <span>{label}</span>
                </Link>
              ))}
            </section>
          ))}
        </div>
      </aside>

      <main className="cvxMain">
        {children}
      </main>

      <nav className="cvxMobileNav">
        {NAV_ITEMS.slice(0, 6).map(([label, href, icon]) => (
          <Link key={href} to={href} className={active(pathname, href) ? "active" : ""}>
            <i>{icon}</i>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
