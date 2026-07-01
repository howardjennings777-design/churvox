import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute, isWorkerRole, isPayrollRole } from "@/lib/roles";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";

function setupPendingLocally() {
  try {
    return window.localStorage.getItem(FIRST_SETUP_KEY) === "true" && window.localStorage.getItem(GUIDE_COMPLETE_KEY) !== "true";
  } catch {
    return false;
  }
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
    user?.is_platform_owner === true ||
    user?.is_admin === true;

  if (isPlatformOwner) return "/admin";
  if (looksWorker(user, payload)) return "/worker/jobs";
  if (looksPayroll(user, payload)) return "/payroll-board";
  if (isWorkerRole(role) || isPayrollRole(role)) return getDefaultRoute(role);

  const plan = String(user?.plan || payload?.plan || "").trim().toLowerCase();
  const status = String(user?.subscription_status || payload?.subscription_status || "").trim().toLowerCase();
  const noPlan = !plan || plan === "none" || plan === "free" || plan === "null" || plan === "undefined";
  const inactiveBilling = !status || status === "none" || status === "cancelled" || status === "canceled" || status === "incomplete" || status === "past_due";

  if (user?.has_app_access === false || payload?.has_app_access === false || noPlan || inactiveBilling) return "/plans";
  if (setupPendingLocally()) return "/setup-guide?first_setup=1";
  return getDefaultRoute(role);
};

const loginLooksValid = (result = {}) => {
  const user = result?.user || result || {};
  return Boolean(
    result?.success !== false &&
      (result?.token ||
        result?.access_token ||
        result?.auth_token ||
        result?.cookieSession ||
        result?.user?.token ||
        result?.user?.access_token ||
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
  const { login, checkAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const result = await login(cleanEmail, password);

      if (!loginLooksValid(result)) {
        setError("Invalid email or password.");
        return;
      }

      const resultPath = getPostLoginPath(result);

      if (resultPath.startsWith("/worker")) {
        setSubmitting(false);
        navigate(resultPath, { replace: true });
        checkAuth?.().catch(() => {});
        return;
      }

      let fresh = null;
      try {
        fresh = await checkAuth?.();
      } catch {
        // Login already succeeded. The app shell can refresh again after navigation.
      }

      const finalPath = getPostLoginPath(fresh || result);
      setSubmitting(false);
      navigate(finalPath, { replace: true });
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
    <main className="cvPublicAuth" data-version="CHURVOX_PUBLIC_LOGIN_MODERN_OS_20260629">
      <Nav />
      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Welcome back</p>
          <h1>Sign in to Command.</h1>
          <p className="cvPublicAuthIntro">
            Open the owner desk, check what Churvox prepared, and keep jobs, money, workers and messages moving.
          </p>

          {error ? <div className="cvPublicAuthError">{error}</div> : null}

          <label>
            Email
            <input
              className="cvPublicNativeInput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.co.nz"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                className="cvPublicNativeInput"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button className="cvPublicAuthGhost" type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button className="cvPublicAuthSubmit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="cvPublicAuthBottom">
            <Link to="/forgot-password">Forgot password?</Link>
            <span> / </span>
            <Link to="/signup">Start trial</Link>
          </p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Owner-approved admin OS</p>
          <h2>Churvox does the admin. The owner checks and approves.</h2>
          <ul>
            <li>Today shows dated work and live business signals.</li>
            <li>Command holds approvals, edits and parked items.</li>
            <li>Jobs, clients, workers, quotes, invoices and messages stay connected.</li>
            <li>Accounting handoff stays guarded and owner-approved.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
