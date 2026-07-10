import React, { useEffect, useRef, useState } from "react";

const primary = [
  ["today", "Today"],
  ["command", "Command"],
  ["work", "Jobs"],
  ["clients", "Clients"],
  ["worker", "Workers"],
  ["quotes", "Quotes"],
  ["invoices", "Invoices"],
];

const office = [
  ["schedule", "Schedule"],
  ["messages", "Messages"],
  ["payroll", "Payroll"],
  ["integrations", "Xero"],
  ["team", "How Churvox works"],
  ["activity", "Activity"],
];

const utility = [
  ["settings", "Settings"],
  ["plans", "Plans"],
  ["help", "Help"],
];

export default function OfficeTeamOwnerNavigation({ screen, go, pendingCount = 0 }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const officeActive = office.some(([key]) => key === screen);

  useEffect(() => {
    function closeOnOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function navigate(key) {
    setOpen(false);
    go(key);
  }

  return (
    <div className="cvOwnerNavigation" aria-label="Owner navigation">
      <nav className="cvOwnerPrimaryNav" aria-label="Main owner pages">
        {primary.map(([key, label]) => (
          <button key={key} type="button" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>
            {label}
            {key === "command" && pendingCount > 0 ? <span className="cvOwnerNavCount">{pendingCount}</span> : null}
          </button>
        ))}
        <div className="cvOwnerMore" ref={menuRef}>
          <button
            type="button"
            className={officeActive || open ? "active" : ""}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            More
          </button>
          {open ? (
            <div className="cvOwnerMoreMenu" role="menu">
              <span>Office and oversight</span>
              {office.map(([key, label]) => (
                <button key={key} type="button" role="menuitem" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
      <nav className="cvOwnerUtilityNav" aria-label="Account and help pages">
        {utility.map(([key, label]) => (
          <button key={key} type="button" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
