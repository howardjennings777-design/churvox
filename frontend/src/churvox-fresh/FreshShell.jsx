import React from "react";

const groups = [
  { title: "Home", items: [["command", "CM", "Command"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["dispatch", "DP", "Dispatch"], ["clients", "CL", "Clients"], ["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "Business", items: [["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["reports", "RP", "Reports"]] },
  { title: "System", items: [["settings", "ST", "Settings"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

const mobileItems = [
  ["command", "CM", "Command"],
  ["jobs", "JB", "Jobs"],
  ["dispatch", "DP", "Dispatch"],
  ["clients", "CL", "Clients"],
  ["invoices", "IV", "Invoices"],
  ["more", "••", "More"],
];

export default function FreshShell({ active, onChange, children }) {
  const [moreOpen, setMoreOpen] = React.useState(false);

  function handleMobile(key) {
    if (key === "more") {
      setMoreOpen((value) => !value);
      return;
    }
    setMoreOpen(false);
    onChange(key);
  }

  const extraMobile = [
    ["quotes", "QT", "Quotes"],
    ["team", "TM", "Team"],
    ["payroll", "PR", "Payroll"],
    ["reports", "RP", "Reports"],
    ["settings", "ST", "Settings"],
    ["plans", "PL", "Plans"],
    ["support", "SP", "Support"],
  ];

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand">
          <div className="freshLogo">C</div>
          <div>
            <strong>CHURVOX</strong>
            <small>Fresh build</small>
          </div>
        </div>

        <nav className="freshNav">
          {groups.map((group) => (
            <section className="freshNavGroup" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([key, mark, label]) => (
                <button
                  key={key}
                  type="button"
                  className={active === key ? "active" : ""}
                  onClick={() => onChange(key)}
                >
                  <i>{mark}</i>
                  <span>{label}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="freshMain">{children}</main>

      {moreOpen && (
        <div className="freshMobileMore">
          {extraMobile.map(([key, mark, label]) => (
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
        {mobileItems.map(([key, mark, label]) => (
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
    </div>
  );
}
