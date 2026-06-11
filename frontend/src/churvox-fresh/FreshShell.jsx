import React from "react";
import FreshQuickCreate from "./FreshQuickCreate";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";
import { useAuth } from "../context/AuthContext";

const groups = [
  {
    title: "Start",
    items: [
      ["setupassistant", "AI", "AI Guide"],
      ["smart", "CP", "Cockpit"],
      ["command", "CM", "Command"],
    ],
  },
  {
    title: "Work",
    items: [
      ["jobs", "JB", "Jobs"],
      ["dispatch", "DP", "Calendar"],
      ["clients", "CL", "Clients"],
      ["quotes", "QT", "Quotes"],
      ["invoices", "IV", "Invoices"],
      ["payments", "PY", "Payments"],
    ],
  },
  {
    title: "Business",
    items: [
      ["team", "TM", "Team"],
      ["payroll", "PR", "Payroll"],
      ["settings", "ST", "Settings"],
      ["plans", "PL", "Plans"],
      ["support", "SP", "Support"],
    ],
  },
];

const labels = {
  firstrun: "First Run Guide",
  setupassistant: "AI Setup Guide",
  smart: "Cockpit",
  command: "Command",
  jobs: "Jobs",
  dispatch: "Calendar",
  clients: "Clients",
  quotes: "Quotes",
  invoices: "Invoices",
  payments: "Payments",
  team: "Team",
  payroll: "Payroll",
  settings: "Settings",
  plans: "Plans",
  support: "Support",
};

const mobileItems = [
  ["setupassistant", "AI", "AI Guide"],
  ["smart", "CP", "Cockpit"],
  ["jobs", "JB", "Jobs"],
  ["command", "CM", "Command"],
  ["more", "••", "More"],
];

const extraMobile = [
  ["dispatch", "DP", "Calendar"],
  ["clients", "CL", "Clients"],
  ["quotes", "QT", "Quotes"],
  ["invoices", "IV", "Invoices"],
  ["payments", "PY", "Payments"],
  ["team", "TM", "Team"],
  ["payroll", "PR", "Payroll"],
  ["settings", "ST", "Settings"],
  ["plans", "PL", "Plans"],
  ["support", "SP", "Support"],
];

function uniqueItems(items) {
  const seen = new Set();
  return items.filter(([key]) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanGroups(sourceGroups) {
  const seen = new Set();
  return sourceGroups.map((group) => ({
    ...group,
    items: group.items.filter(([key]) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  }));
}

export default function FreshShell({ active, onChange, children }) {
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [quickType, setQuickType] = React.useState(null);

  const safeGroups = React.useMemo(() => cleanGroups(groups), []);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => {
    const mainKeys = new Set(safeMobileItems.map(([key]) => key));
    return uniqueItems(extraMobile).filter(([key]) => !mainKeys.has(key));
  }, [safeMobileItems]);

  async function handleLogout() {
    try {
      if (auth?.logout) await auth.logout();
    } finally {
      try {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("owner_portal_session");
        window.localStorage.removeItem("platform_owner_email");
      } catch {
        // Keep logout moving.
      }

      window.location.href = "/login";
    }
  }

  function go(key) {
    if (key === "more") return;
    setMoreOpen(false);
    setQuickType(null);
    onChange(key);
  }

  function handleMobile(key) {
    if (key === "more") {
      setMoreOpen((value) => !value);
      return;
    }
    go(key);
  }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand">
          <div className="freshLogo">C</div>
          <div>
            <strong>CHURVOX</strong>
            <small>Owner workspace</small>
          </div>
        </div>

        <button className="freshLogoutSide" type="button" onClick={handleLogout}>
          Log out
        </button>

        <nav className="freshNav">
          {safeGroups.map((group) => (
            <section className="freshNavGroup" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([key, mark, label]) => (
                <button
                  key={key}
                  type="button"
                  className={active === key ? "active" : ""}
                  onClick={() => go(key)}
                >
                  <i>{mark}</i>
                  <span>{label}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="freshMain">
        <div className="freshTopbar">
          <div>
            <span>Current area</span>
            <strong>{labels[active] || "Churvox"}</strong>
          </div>

          <FreshTopStatus onNavigate={go} />
          <FreshSearch onNavigate={go} />

          <div className="freshTopActions">
            <button type="button" onClick={() => go("setupassistant")}>AI Guide</button>
            <button type="button" onClick={() => go("command")}>Command</button>
            <button type="button" onClick={() => setQuickType("job")}>New job</button>
            <button type="button" onClick={() => setQuickType("quote")}>New quote</button>
            <button type="button" onClick={() => setQuickType("client")}>Add client</button>
            <button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {children}
      </main>

      {moreOpen && (
        <div className="freshMobileMore">
          {safeExtraMobile.map(([key, mark, label]) => (
            <button
              key={key}
              type="button"
              className={active === key ? "active" : ""}
              onClick={() => handleMobile(key)}
            >
              <i>{mark}</i>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="freshMobileNav" aria-label="Mobile navigation">
        {safeMobileItems.map(([key, mark, label]) => (
          <button
            key={key}
            type="button"
            className={active === key || (key === "more" && moreOpen) ? "active" : ""}
            onClick={() => handleMobile(key)}
          >
            <i>{mark}</i>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {quickType && (
        <FreshQuickCreate
          type={quickType}
          onClose={() => setQuickType(null)}
          onNavigate={go}
        />
      )}
    </div>
  );
}
