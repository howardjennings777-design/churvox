import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { filterOwnerItems, ownerPlan } from "./OfficeTeamAccess";
import "./OfficeTeamMoreMenuPaidLaunch.css";

const primary = [
  ["today", "Today"],
  ["intelligence", "Intelligence"],
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

function focusableMenuItems(menu) {
  return Array.from(menu?.querySelectorAll('[role="menuitem"]') || []).filter((item) => !item.disabled && item.getClientRects().length > 0);
}

export default function OfficeTeamOwnerNavigation({ screen, go, pendingCount = 0 }) {
  const { user } = useAuth();
  const plan = ownerPlan(user);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const visiblePrimary = useMemo(() => filterOwnerItems(primary, user), [user]);
  const visibleOffice = useMemo(() => filterOwnerItems(office, user), [user]);
  const visibleUtility = useMemo(() => filterOwnerItems(utility, user), [user]);
  const officeActive = visibleOffice.some(([key]) => key === screen);
  const menuId = "churvox-owner-more-menu";

  useEffect(() => {
    setOpen(false);
  }, [screen, plan]);

  useEffect(() => {
    function closeOnOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => focusableMenuItems(menuRef.current)[0]?.focus());
  }, [open]);

  function navigate(key) {
    setOpen(false);
    go(key);
  }

  function handleTriggerKeyDown(event) {
    if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
  }

  function handleMenuKeyDown(event) {
    const items = focusableMenuItems(menuRef.current);
    if (!items.length) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length].focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (event.key === "Tab") {
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="cvOwnerNavigation" aria-label="Owner navigation" data-plan={plan}>
      <div className="cvOwnerMainNavigation">
        <nav className="cvOwnerPrimaryNav" aria-label="Main owner pages">
          {visiblePrimary.map(([key, label]) => (
            <button key={key} type="button" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>
              {label}
              {key === "command" && pendingCount > 0 ? <span className="cvOwnerNavCount">{pendingCount}</span> : null}
            </button>
          ))}
        </nav>
        {(visibleOffice.length || visibleUtility.length) ? (
          <div className="cvOwnerMore" ref={menuRef}>
            <button
              ref={triggerRef}
              type="button"
              className={officeActive || open ? "active" : ""}
              aria-haspopup="menu"
              aria-controls={menuId}
              aria-expanded={open}
              onKeyDown={handleTriggerKeyDown}
              onClick={() => setOpen((value) => !value)}
            >
              More
            </button>
            {open ? (
              <>
                <button className="cvOwnerMoreBackdrop" type="button" aria-label="Close More menu" onClick={() => setOpen(false)} />
                <div id={menuId} className="cvOwnerMoreMenu" role="menu" aria-label={`More tools for ${plan}`} onKeyDown={handleMenuKeyDown}>
                  <header className="cvOwnerMoreHeader">
                    <span>Office and oversight</span>
                    <button type="button" aria-label="Close More menu" onClick={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }}>Close</button>
                  </header>
                  {visibleOffice.map(([key, label]) => (
                    <button key={key} type="button" role="menuitem" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>
                      {label}
                    </button>
                  ))}
                  {visibleUtility.length ? (
                    <section className="cvOwnerMoreUtility" aria-label="Account and help">
                      <span>Account and help</span>
                      {visibleUtility.map(([key, label]) => (
                        <button key={key} type="button" role="menuitem" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>{label}</button>
                      ))}
                    </section>
                  ) : null}
                  <small>Only tools included in the current Churvox plan are shown.</small>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <nav className="cvOwnerUtilityNav" aria-label="Account and help pages">
        {visibleUtility.map(([key, label]) => (
          <button key={key} type="button" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
