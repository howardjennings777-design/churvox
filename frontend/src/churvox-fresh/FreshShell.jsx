import React from "react";

const groups = [
  { title: "Command", items: [["command", "CM", "Command Board"]] },
  { title: "Work", items: [["hub", "SH", "Smart Hub"], ["jobs", "JB", "Jobs"], ["dispatch", "DP", "Dispatch"], ["clients", "CL", "Clients"], ["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "Business", items: [["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["reports", "RP", "Reports"]] },
  { title: "System", items: [["settings", "ST", "Settings"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

export default function FreshShell({ active, onChange, children }) {
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
    </div>
  );
}
