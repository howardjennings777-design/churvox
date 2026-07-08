import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute, isWorkerRole, isPayrollRole } from "@/lib/roles";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";
import "./RealAppLoginScreen.css";
import "./RealLogoBlend.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const LOGIN_TIMEOUT_MS = 28000;
const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-integrated-mark-20260708b";

function ChurvoxAppLogo({ compact = false, wordmark = false }) {
  return (
    <div className={`cvAppLogoMark cvIntegratedAuthLogo ${compact ? "compact" : ""} ${wordmark ? "wordmark" : ""}`} aria-label="Churvox logo">
      <img src={BRAND_ICON} alt="Churvox" />
    </div>
  );
}

function setupPendingLocally() {
  try {
    return window.localStorage.getItem(FIRST_SETUP_KEY) === "true" && window.localStorage.getItem(GUIDE_COMPLETE_KEY) !== "true";
  } catch {
    return false;
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
  return (
    user.role || payload.role || user.user_role || payload.user_role || user.account_role || user.member_role || user.team_role ||
    user.staff_role || user.worker_role || user.type || payload.type || user.user_type || user.account_type || user.member_type ||
    user.staff_type || user.worker_type || business.role || business.user_role || business.member_role || ""
  );
}

function truthy(value) {
  if (typeof value === "string") return ["1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"].includes(value.trim().toLowerCase());
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

function looksWorker(user = {}, payload = {}) {
  const role = rawRole(user, payload);
  return Boolean(
    isWorkerRole(role) ||
    truthy(user.is_worker) || truthy(payload.is_worker) || truthy(user.worker) || truthy(user.is_field_worker) ||
    truthy(user.worker_account) || truthy(user.worker_portal) || truthy(user.worker_login) ||
    user.worker_id || payload.worker_id || user.staff_id || user.team_member_id || user.invite_role === "worker"
  );
}

function looksPayroll(user = {}, payload = {}) {
  const role = rawRole(user, payload);
  return Boolean(isPayrollRole(role) || truthy(user.is_payroll) || truthy(payload.is_payroll) || truthy(user.payroll_user) || user.payroll_id);
}

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const roleRaw = rawRole(user, payload);
  const role = normalizeRole(roleRaw);
  const isPlatformOwner =
    email === "hello@churvox.com" ||
    email === "howardjennings77@gmail.com" ||
    user?.is_platform_owner === true ||
    user?.is_admin === true;

  if (isPlatformOwner) return "/admin";
  if (looksWorker(user, payload)) return "/worker/today";
  if (looksPayroll(user, payload)) return "/payroll-board";
  if (isWorkerRole(role) || isPayrollRole(role)) return getDefaultRoute(role);

  const status = String(user?.subscription_status || payload?.subscription_status || "").trim().toLowerCase();
  const explicitlyLocked =
    user?.has_app_access === false ||
    payload?.has_app_access === false ||
    user?.billing_lock_reason ||
    payload?.billing_lock_reason ||
    ["cancelled", "canceled", "incomplete", "incomplete_expired", "locked", "disabled"].includes(status);

  if (explicitlyLocked) return "/plans";
  if (setupPendingLocally()) return "/setup-guide?first_setup=1";
  return getDefaultRoute(role) || "/dashboard";
};

const loginLooksValid = (result = {}) => {
  const user = result?.user || result || {};
  return Boolean(
    result?.success !== false &&
      (result?.token ||
        result?.access_token ||
        result?.auth_token ||
        result?.accessToken ||
        result?.jwt ||
        result?.cookieSession ||
        result?.user?.token ||
        result?.user?.access_token ||
        result?.user?.accessToken ||
        user?.email ||
        user?.id ||
        user?._id ||
        user?.role ||
        user?.user_role ||
        user?.account_type ||
        user?.worker_id)
  );
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const appMode = typeof window !== "undefined" && new URLSearchParams(window.location.search || "").get("app") === "1";

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await withTimeout(login(cleanEmail, password), LOGIN_TIMEOUT_MS, "Login is taking too long. Try again in a fresh tab.");

      if (!loginLooksValid(result)) {
        setError("Invalid email or password.");
        return;
      }

      const finalPath = getPostLoginPath(result);
      setSubmitting(false);
      navigate(finalPath, { replace: true });
      if (finalPath.startsWith("/dashboard") || finalPath === "/plans") {
        window.setTimeout(() => window.dispatchEvent(new Event("churvox-owner-app-ready")), 120);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`cvPublicAuth cvRealAppLogin ${appMode ? "cvLoginAppOnly" : ""}`} data-version="CHURVOX_INTEGRATED_LOGO_LOGIN_20260708B">
      {!appMode ? <Nav /> : null}
      <section className="cvPublicAuthShell cvRealAppShell">
        {!appMode ? (
          <aside className="cvAppScreenStage" aria-label="Churvox mobile app logo screen preview">
            <div className="cvAppScreenBrandLockup">
              <ChurvoxAppLogo />
              <div>
                <h2>Churvox</h2>
                <p>Does the admin. <strong>You approve.</strong></p>
              </div>
            </div>

            <div className="cvPhoneFrame" aria-hidden="true">
              <div className="cvPhoneStatus"><span>9:41</span><i /></div>
              <div className="cvPhoneSplashLogo"><ChurvoxAppLogo /></div>
              <div className="cvPhoneWordmark">Churvo<span>x</span></div>
              <p className="cvPhonePromise">Does the admin. <b>You approve.</b></p>
              <div className="cvPhoneSignals">
                <span><b>5</b><small>approvals</small></span>
                <span><b>8</b><small>jobs today</small></span>
                <span><b>$24k</b><small>waiting</small></span>
                <span><b>3</b><small>field updates</small></span>
              </div>
            </div>

            <div className="cvAppScreenNotes">
              <span>Owner command</span>
              <span>Field flow</span>
              <span>Proof + messages</span>
            </div>
          </aside>
        ) : null}

        <form className="cvPublicAuthCard cvRealAppAuthCard" onSubmit={handleSubmit}>
          <div className="cvLoginMiniBrand">
            <ChurvoxAppLogo compact />
            <div>
              <b>Churvox</b>
              <small>{appMode ? "Worker and owner sign in" : "Owner approval desk"}</small>
            </div>
          </div>

          <p className="cvPublicAuthKicker">Welcome back</p>
          <h1>{appMode ? "Sign in." : "Open Command."}</h1>
          <p className="cvPublicAuthIntro">
            {appMode ? "Use your Churvox login. Workers open the field app. Owners open the command floor." : "Sign in to check the admin Churvox prepared, approve what is ready, and keep work moving."}
          </p>

          {error ? <div className="cvPublicAuthError">{error}</div> : null}

          <label>
            Email
            <input className="cvPublicNativeInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.nz" autoComplete="email" />
          </label>

          <label>
            Password
            <div className="password-row">
              <input className="cvPublicNativeInput" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
              <button className="cvPublicAuthGhost" type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
          </label>

          <button className="cvPublicAuthSubmit" type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>

          <p className="cvPublicAuthBottom">
            <Link to="/forgot-password">Forgot password?</Link>
            <span> / </span>
            <Link to="/signup">Start trial</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
