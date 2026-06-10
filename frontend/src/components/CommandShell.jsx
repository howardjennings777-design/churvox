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

const ROOT_SELECTORS = [
  ":scope > main",
  ".cxRoot",
  ".ch4Root",
  ".scRoot",
  ".dwRoot",
  ".rpRoot",
  ".slRoot",
  ".srRoot",
  ".teamRoleRoot",
  ".ivRoot",
  ".concept-c2-frame",
  ".xcf-real-page",
  ".xcf-workspace",
  ".xcf-shell.xcf-real-page",
].join(",");

const WRAP_SELECTORS = [
  ".cxWrap",
  ".ch4Wrap",
  ".scWrap",
  ".dwWrap",
  ".rpWrap",
  ".slWrap",
  ".srWrap",
  ".teamRoleWrap",
  ".ivWrap",
  "main > section",
].join(",");

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

function setImportant(el, key, value) {
  try {
    el.style.setProperty(key, value, "important");
  } catch {}
}

function normaliseChildPages(canvas) {
  if (!canvas) return;

  canvas.querySelectorAll(ROOT_SELECTORS).forEach((el) => {
    el.classList.add("cvxChildRoot");
    setImportant(el, "position", "relative");
    setImportant(el, "inset", "auto");
    setImportant(el, "left", "auto");
    setImportant(el, "right", "auto");
    setImportant(el, "top", "auto");
    setImportant(el, "bottom", "auto");
    setImportant(el, "z-index", "auto");
    setImportant(el, "width", "100%");
    setImportant(el, "max-width", "100%");
    setImportant(el, "min-height", "auto");
    setImportant(el, "margin", "0");
    setImportant(el, "padding", "0");
    setImportant(el, "background", "transparent");
    setImportant(el, "overflow", "visible");
    setImportant(el, "box-sizing", "border-box");
  });

  canvas.querySelectorAll(WRAP_SELECTORS).forEach((el) => {
    el.classList.add("cvxChildWrap");
    setImportant(el, "width", "100%");
    setImportant(el, "max-width", "100%");
    setImportant(el, "margin-left", "auto");
    setImportant(el, "margin-right", "auto");
    setImportant(el, "box-sizing", "border-box");
  });

  canvas.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") || "";

    if (/min-height:\s*100vh|min-height:\s*100svh/i.test(style)) {
      setImportant(el, "min-height", "auto");
    }

    if (/max-width:\s*1440|max-width:\s*1480|max-width:\s*1380|max-width:\s*1260/i.test(style)) {
      setImportant(el, "max-width", "100%");
      setImportant(el, "width", "100%");
    }

    if (/grid-template-columns/i.test(style)) {
      el.classList.add("cvxChildGrid");
      setImportant(el, "grid-template-columns", "repeat(auto-fit, minmax(min(280px, 100%), 1fr))");
      setImportant(el, "gap", "18px");
      setImportant(el, "align-items", "start");
    }
  });
}

export default function CommandShell({ children }) {
  const { pathname } = useLocation();
  const grouped = groups();
  const canvasRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const run = () => normaliseChildPages(canvas);
    run();

    const timer = window.setTimeout(run, 50);
    const observer = new MutationObserver(run);
    observer.observe(canvas, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname, children]);

  return (
    <div className="cvxShell" data-command-shell="true">
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
        <div ref={canvasRef} className="cvxShellCanvas">
          {children}
        </div>
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
