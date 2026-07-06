import React from "react";

const NAV_BUTTON_ID = "cvx-world-ledger-nav-button";

function openLedgerPanel() {
  const tab = document.querySelector(".cvxWorldLedgerTab");
  if (tab instanceof HTMLButtonElement) tab.click();
}

function ensureLedgerNavButton() {
  const nav = document.querySelector(".cvxNav");
  if (!nav || document.getElementById(NAV_BUTTON_ID)) return;
  const button = document.createElement("button");
  button.id = NAV_BUTTON_ID;
  button.type = "button";
  button.className = "cvxLedgerNavButton";
  button.setAttribute("aria-label", "Open Churvox Admin Ledger country presets");
  button.innerHTML = "<b>Ledger</b><small>Country pack</small>";
  button.addEventListener("click", openLedgerPanel);
  nav.appendChild(button);
}

export default function WorldAdminLedgerNavBridge() {
  React.useEffect(() => {
    ensureLedgerNavButton();
    const observer = new MutationObserver(ensureLedgerNavButton);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(ensureLedgerNavButton, 1200);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      const button = document.getElementById(NAV_BUTTON_ID);
      if (button) button.remove();
    };
  }, []);
  return null;
}
