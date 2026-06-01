// CHURVOX_BUSINESS_SETTINGS_FIRST_SETUP_WRAPPER_20260601
import React from "react";
import { useNavigate } from "react-router-dom";
import BusinessSettingsPageImpl from "./BusinessSettingsPage.jsx";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";

function isFirstSetup() {
  try {
    return new URLSearchParams(window.location.search).get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "true";
  } catch {
    return false;
  }
}

export default function BusinessSettingsPage(props) {
  const navigate = useNavigate();
  const firstSetup = isFirstSetup();

  function continueToClient() {
    try { localStorage.setItem(FIRST_SETUP_KEY, "client"); } catch {}
    navigate("/clients/new?first_setup=1");
  }

  return (
    <>
      <BusinessSettingsPageImpl {...props} />
      {firstSetup ? (
        <div style={{ position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 120, width: "min(720px, calc(100vw - 24px))", border: "1px solid rgba(125,189,255,.22)", borderRadius: 22, padding: 12, background: "rgba(3,13,33,.92)", boxShadow: "0 24px 80px rgba(0,0,0,.35)", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", color: "white", backdropFilter: "blur(18px)" }} data-version="CHURVOX_BUSINESS_SETTINGS_FIRST_SETUP_WRAPPER_20260601">
          <div>
            <b style={{ display: "block", fontSize: 14 }}>First setup: business details</b>
            <span style={{ display: "block", fontSize: 12, opacity: .75 }}>Save your details, then add your first client so the rest of the flow has a real customer.</span>
          </div>
          <button type="button" onClick={continueToClient} style={{ border: 0, borderRadius: 14, padding: "12px 16px", background: "linear-gradient(135deg,#14d8f4,#245cff)", color: "white", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
            Continue to first client
          </button>
        </div>
      ) : null}
    </>
  );
}
