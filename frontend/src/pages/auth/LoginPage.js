import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute, isWorkerRole, isPayrollRole } from "@/lib/roles";
import { OWNER_MAINTENANCE_MODE, isWorkerMaintenanceAccess } from "@/lib/maintenanceMode";
import MaintenancePage from "../MaintenancePage";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";
import "./RealAppLoginScreen.css";
import "./RealLogoBlend.css";
import "./ChurvoxLoginPolish.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const LOGIN_TIMEOUT_MS = 28000;
const ACCESS_REFRESH_TIMEOUT_MS = 9000;
const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-integrated-mark-20260708b";
const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const SAFE_RETURN_PATHS = new Set([
  "/dashboard", "/plans", "/guide", "/setup", "/setup-guide",
  "/delete-account", "/support", "/refunds-cancellations", "/security", "/contact",
]);

function ChurvoxAppLogo({ compact = false }) {
  return <div className={`cvAppLogoMark cvIntegratedAuthLogo ${compact ? "compact" : ""}`} aria-label="Churvox logo"><img src={BRAND_ICON} alt="Churvox" /></div>;
}

function setupPendingLocally() {
  try {
    return localStorage.getItem(FIRST_SETUP_KEY) === "true" && localStorage.getItem(GUIDE_COMPLETE_KEY) !== "true";
  } catch {
    return false;
  }
}

function requestedNextPath() {
  try {
    const raw = new URLSearchParams(window.location.search || "").get("next") || "";
    if (!raw || /[\\\u0000-\u001f]/.test(raw) || raw.startsWith("//")) return "";
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin || !SAFE_RETURN_PATHS.has(parsed.pathname)) return "";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function rawRole(user = {}, payload = {}) {
  const business = user?.business && typeof user.business === "object" ? user.business : {};
  return user.role || payload.role || user.user_role || payload.user_role || user.account_role || user.member_role || user.team_role || user.staff_role || user.worker_role || user.type || payload.type || user.user_type || user.account_type || user.member_type || user.staff_type || user.worker_type || business.role || business.user_role || business.member_role || "";
}

function truthy(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return ["1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"].includes(String(value || "").trim().toLowerCase());
}

function looksWorker(user = {}, payload = {}) {
  const role = rawRole(user, payload);
  return Boolean(
    isWorkerRole(role) || truthy(user.is_worker) || truthy(payload.is_worker) || truthy(user.worker) ||
    truthy(user.is_field_worker) || truthy(user.worker_account) || truthy(user.worker_portal) ||
    truthy(user.worker_login) || user.worker_id || payload.worker_id || user.staff_id ||
    user.team_member_id || user.invite_role === "worker"
  );
}

function looksPayroll(user = {}, payload = {}) {
  const role = rawRole(user, payload);
  return Boolean(isPayrollRole(role) || truthy(user.is_payroll) || truthy(payload.is_payroll) || truthy(user.payroll_user) || user.payroll_id);
}

function verificationPath(email) {
  const params = new URLSearchParams({ pending: "1" });
  if (email) params.set("email", email);
  return `/verify-email?${params.toString()}`;
}

function postLoginPath(payload = {}) {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const role = normalizeRole(rawRole(user, payload));

  if (email === PLATFORM_OWNER_EMAIL) return "/admin";
  if (looksWorker(user, payload)) return "/worker/today";
  if (looksPayroll(user, payload)) return "/payroll-board";
  if (isWorkerRole(role) || isPayrollRole(role)) return getDefaultRoute(role);
  if (user?.email_verified === false || payload?.email_verified === false) return verificationPath(email);

  const status = String(user?.subscription_status || payload?.subscription_status || "").trim().toLowerCase();
  const hasAccess = user?.has_app_access === true || payload?.has_app_access === true || user?.free_tester_access === true || payload?.free_tester_access === true || ["tester_free", "active", "paid", "trial", "trialing", "past_due"].includes(status);
  const locked = !hasAccess && (
    user?.has_app_access === false || payload?.has_app_access === false || user?.billing_lock_reason ||
    payload?.billing_lock_reason || ["cancelled", "canceled", "unpaid", "incomplete", "incomplete_expired", "locked", "disabled", "expired"].includes(status)
  );
  if (locked) return "/plans";

  const requested = requestedNextPath();
  if (requested) return requested;
  if (setupPendingLocally()) return "/setup-guide?first_setup=1";
  return getDefaultRoute(role) || "/dashboard";
}

function loginLooksValid(result = {}) {
  const user = result?.user || result || {};
  const identity = Boolean(user?.email || user?.id || user?._id || user?.role || user?.user_role || user?.account_type || user?.worker_id);
  return result?.success !== false && identity;
}

function friendlyLoginError(error) {
  const status = error?.response?.status;
  const detail = String(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "").trim();
  if (status === 429 || /too many/i.test(detail)) return "Too many failed attempts. Try again in 15 minutes.";
  if (status === 503 || status === 504 || /unavailable|taking too long|did not respond/i.test(detail)) return "Churvox could not reach the login service. Please try again shortly.";
  if (/session could not be confirmed/i.test(detail)) return "Your session could not be confirmed. Please sign in again.";
  if (status === 403 && /invite link/i.test(detail)) return detail;
  if (status === 403 && /disabled|revoked|locked/i.test(detail)) return "Account access is disabled. Contact Churvox support.";
  if (/different account/i.test(detail)) return detail;
  return "Invalid email or password.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, checkAuth, logout, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const workerAccess = isWorkerMaintenanceAccess();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search || "") : new URLSearchParams();
  const appMode = params.get("app") === "1";
  const verifiedNotice = params.get("verified") === "1";

  if (OWNER_MAINTENANCE_MODE && !workerAccess) return <MaintenancePage workerAccess />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || authLoading) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = await withTimeout(login(cleanEmail, password, { confirmSession: true }), LOGIN_TIMEOUT_MS, "Login service did not respond in time.");
      if (!loginLooksValid(result)) throw new Error("Invalid email or password.");

      let freshUser;
      try {
        freshUser = await withTimeout(checkAuth({ allowOfflineFallback: false }), ACCESS_REFRESH_TIMEOUT_MS, "Your session could not be confirmed. Please sign in again.");
      } catch {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }
      if (!freshUser) {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }

      const confirmed = {
        ...result,
        ...freshUser,
        user: { ...(result?.user || {}), ...(freshUser?.user || freshUser) },
      };
      const confirmedUser = confirmed.user || confirmed;
      if (OWNER_MAINTENANCE_MODE && workerAccess && !looksWorker(confirmedUser, confirmed) && !looksPayroll(confirmedUser, confirmed)) {
        try { await logout?.(); } catch {}
        throw new Error("Owner access is paused while Churvox is being upgraded. Worker job access remains available.");
      }

      const destination = postLoginPath(confirmed);
      navigate(destination, { replace: true });
      if (destination.startsWith("/dashboard") || destination === "/plans") {
        window.setTimeout(() => window.dispatchEvent(new Event("churvox-owner-app-ready")), 120);
      }
    } catch (loginError) {
      setError(friendlyLoginError(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  const preparing = authLoading && !submitting;

  return (
    <main className={`cvPublicAuth cvRealAppLogin cvChurvoxLogin cvAccessChamber ${appMode ? "cvLoginAppOnly" : ""}`} data-version="CHURVOX_ACCESS_CHAMBER_20260724_V2">
      {!appMode ? <Nav /> : null}
      <section className="cvAccessScene">
        {!appMode ? (
          <aside className="cvAccessSignal" aria-label="Churvox secure access routing">
            <div className="cvAccessSignalBrand">
              <ChurvoxAppLogo />
              <div><span>Churvox access layer</span><h2>One login.<br />The right room opens.</h2></div>
            </div>

            <div className="cvAccessOrbit" aria-hidden="true">
              <i /><i /><i />
              <div><b>CV</b><small>identity route</small></div>
            </div>

            <div className="cvAccessRouteList">
              <article><em>01</em><div><b>Owner recognised</b><small>Command and the living office open.</small></div><span>COMMAND</span></article>
              <article><em>02</em><div><b>Worker recognised</b><small>Today’s jobs and field tools open.</small></div><span>FIELD</span></article>
              <article><em>03</em><div><b>Access checked</b><small>Plans, tester access and account rules remain intact.</small></div><span>GUARD</span></article>
            </div>

            <div className="cvAccessSafety"><i /><p><b>Login never performs business actions.</b><span>It verifies the person and opens the correct workspace. Nothing sends, charges or changes here.</span></p></div>
          </aside>
        ) : null}

        <form className="cvPublicAuthCard cvRealAppAuthCard cvChurvoxLoginCard cvAccessConsole" onSubmit={handleSubmit} noValidate>
          <div className="cvAccessConsoleTop">
            <div className="cvLoginMiniBrand"><ChurvoxAppLogo compact /><div><b>Churvox</b><small>{workerAccess ? "Worker access" : "Secure office entry"}</small></div></div>
            <span><i />Live</span>
          </div>

          <p className="cvPublicAuthKicker">Identity check</p>
          <h1>{workerAccess ? "Open today’s work." : appMode ? "Enter Churvox." : "Open the right room."}</h1>
          <p className="cvPublicAuthIntro">{workerAccess ? "Sign in and Churvox will take you straight to today’s field work." : "Your account decides what opens next—Command for owners, the field view for workers, and the correct access gate for everyone else."}</p>
          <div className="cvAccessStatus"><span>SESSION</span><b>{submitting ? "Checking identity" : preparing ? "Preparing secure entry" : "Waiting for identity"}</b><i className={submitting || preparing ? "working" : ""} /></div>

          {verifiedNotice && !error ? <div className="cvPublicAuthSuccess" role="status">Email verified. Sign in to continue.</div> : null}
          {error ? <div className="cvPublicAuthError" role="alert" aria-live="assertive">{error}</div> : null}

          <label>Email<input className="cvPublicNativeInput" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.co.nz" autoComplete="email" autoCapitalize="none" spellCheck="false" inputMode="email" autoFocus disabled={submitting} /></label>
          <label>Password<div className="password-row"><input className="cvPublicNativeInput" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" autoComplete="current-password" disabled={submitting} /><button className="cvPublicAuthGhost" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} disabled={submitting}>{showPassword ? "Hide" : "Show"}</button></div></label>
          <button className="cvPublicAuthSubmit" type="submit" disabled={submitting || authLoading}>{submitting ? "Checking access…" : preparing ? "Preparing secure entry…" : "Open Churvox"}</button>
          <p className="cvPublicAuthBottom">{workerAccess ? <Link to="/">Back to website</Link> : <Link to="/forgot-password">Forgot password?</Link>}{!workerAccess ? <><span> / </span><Link to="/signup?plan=operator">Start trial</Link></> : null}</p>
          <div className="cvAccessConsoleFoot"><span>Encrypted session</span><span>Role-aware entry</span><span>No hidden action</span></div>
        </form>
      </section>
    </main>
  );
}
