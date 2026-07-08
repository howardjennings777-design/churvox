import React from "react";
import { Link } from "react-router-dom";
import { MAINTENANCE_STARTED_LABEL } from "../lib/maintenanceMode";
import "./auth/AuthPublicCommand.css";
import "./auth/RealAppLoginScreen.css";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-maintenance-20260709";

export default function MaintenancePage({ workerAccess = true }) {
  return (
    <main className="cvPublicAuth cvRealAppLogin cvMaintenanceShell" data-version="CHURVOX_OWNER_MAINTENANCE_20260709">
      <section className="cvPublicAuthShell cvRealAppShell">
        <aside className="cvAppScreenStage" aria-label="Churvox maintenance notice">
          <div className="cvAppScreenBrandLockup">
            <div className="cvAppLogoMark cvIntegratedAuthLogo compact"><img src={BRAND_ICON} alt="Churvox" /></div>
            <div>
              <h2>Churvox</h2>
              <p>Office upgrade in progress.</p>
            </div>
          </div>
          <div className="cvPhoneFrame" aria-hidden="true">
            <div className="cvPhoneStatus"><span>Online</span><i /></div>
            <div className="cvPhoneSplashLogo"><img src={BRAND_ICON} alt="" /></div>
            <div className="cvPhoneWordmark">Churvo<span>x</span></div>
            <p className="cvPhonePromise">Worker job access remains available.</p>
            <div className="cvPhoneSignals">
              <span><b>Owner</b><small>maintenance</small></span>
              <span><b>Worker</b><small>online</small></span>
              <span><b>Data</b><small>safe</small></span>
              <span><b>Admin</b><small>upgrade</small></span>
            </div>
          </div>
        </aside>

        <section className="cvPublicAuthCard cvRealAppAuthCard" style={{ alignSelf: "center" }}>
          <div className="cvLoginMiniBrand">
            <div className="cvAppLogoMark cvIntegratedAuthLogo compact"><img src={BRAND_ICON} alt="Churvox" /></div>
            <div>
              <b>Churvox</b>
              <small>Owner dashboard maintenance</small>
            </div>
          </div>
          <p className="cvPublicAuthKicker">Scheduled upgrade</p>
          <h1>Owner access is paused while we upgrade Churvox.</h1>
          <p className="cvPublicAuthIntro">
            We are upgrading the owner dashboard and Command office tools from {MAINTENANCE_STARTED_LABEL}. Existing worker job access remains available so field work can continue.
          </p>
          <div className="cvPublicAuthError" style={{ background: "rgba(255,247,237,.92)", borderColor: "rgba(249,115,22,.28)", color: "#7c2d12" }}>
            This is a controlled maintenance window. Churvox data is not being deleted, and worker job access is still open.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            {workerAccess ? <Link className="cvPublicAuthSubmit" to="/login?worker=1" style={{ textAlign: "center", textDecoration: "none" }}>Worker sign in</Link> : null}
            <Link className="cvPublicAuthGhost" to="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Back to website</Link>
          </div>
          <p className="cvPublicAuthBottom" style={{ marginTop: 18 }}>
            Need access for a job? Use the worker sign in above.
          </p>
        </section>
      </section>
    </main>
  );
}
