import React from "react";

const nav = [
  ["command", "CM", "Command"],
  ["hub", "SH", "Smart Hub"],
  ["jobs", "JB", "Jobs"],
  ["clients", "CL", "Clients"],
  ["quotes", "QT", "Quotes"],
  ["invoices", "IV", "Invoices"],
  ["team", "TM", "Team"],
  ["payroll", "PR", "Payroll"],
  ["reports", "RP", "Reports"],
  ["settings", "ST", "Settings"],
  ["plans", "PL", "Plans"],
  ["support", "SP", "Support"],
];

export default function FreshShell({ active, onChange, children }) {
  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><br /><small>Fresh build</small></div></div>
        <nav className="freshNav">
          {nav.map(([key, mark, label]) => (
            <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => onChange(key)}>
              <i>{mark}</i><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="freshMain">{children}</main>
    </div>
  );
}
