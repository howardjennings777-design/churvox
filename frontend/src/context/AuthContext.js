import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 15000;
const WORKER_AUTH_TIMEOUT_MS = 10000;
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const AUTH_SNAPSHOT_KEY = "churvox_auth_session_snapshot_v1";
const AUTH_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_REFRESH_GRACE_MS = 1000 * 60 * 60 * 12;
const VALID_PLANS = new Set(["start", "solo", "crew", "team", "operator", "pro", "command", "enterprise"]);
const GOOD_STATUSES = new Set(["active", "paid", "trialing", "trial", "past_due", "tester_free", "worker"]);

function clearStoredAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    localStorage.removeItem(AUTH_SNAPSHOT_KEY);
  } catch {}
}

function removePlanFlag() {
  try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
}

function cleanPlan(value) {
  return String(value || "").trim().toLowerCase();
}

function userPlan(user = {}) {
  return cleanPlan(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier || user.plan_name || user?.business?.plan || user?.business?.subscription_plan);
}

function hasValidPlan(user = {}) {
  return VALID_PLANS.has(userPlan(user));
}

function subscriptionStatus(user = {}) {
  return String(user.subscription_status || user.billing_status || user.stripe_status || "").trim().toLowerCase();
}

function isLockedStatus(status) {
  return ["cancelled", "canceled", "unpaid", "incomplete_expired", "locked", "disabled"].includes(status);
}

function rawRole(user = {}) {
  const business = user?.business && typeof user.business === "object" ? user.business : {};
  return (
    user.role || user.user_role || user.account_role || user.member_role || user.team_role || user.staff_role || user.worker_role ||
    user.type || user.user_type || user.account_type || user.member_type || user.staff_type || user.worker_type ||
    business.role || business.user_role || business.member_role || ""
  );
}

function truthy(value) {
  if (typeof value === "string") return ["1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"].includes(value.trim().toLowerCase());
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

function inferredWorker(user = {}) {
  const role = rawRole(user);
  return Boolean(
    isWorkerRole(role) ||
    truthy(user.is_worker) || truthy(user.worker) || truthy(user.is_field_worker) || truthy(user.field_worker) ||
    truthy(user.worker_account) || truthy(user.worker_portal) || truthy(user.worker_login) ||
    user.worker_id || user.staff_id || user.team_member_id || user.invite_role === "worker"
  );
}

function inferredPayroll(user = {}) {
  const role = rawRole(user);
  return Boolean(isPayrollRole(role) || truthy(user.is_payroll) || truthy(user.payroll_user) || user.payroll_id);
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken || data?.user?.token || data?.user?.access_token || data?.user?.accessToken || "";
}

function userFrom(data = {}) {
  const picked = data?.user || data?.data?.user || data?.data || data || {};
  if (!picked || typeof picked !== "object") return null;
  if (!(picked.email || picked.id || picked._id || picked.role || picked.user_role || picked.account_type || picked.worker_id || picked.business_id || picked.businessId)) return null;
  const id = picked.id || picked._id || data.id || data._id || "";
  const email = String(picked.email || data.email || "").trim().toLowerCase();
  return {
    ...picked,
    id: String(id || ""),
    email,
    business_id: String(picked.business_id || picked.businessId || data.business_id || id || ""),
  };
}

function headersFor(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authError(data = {}) {
  if (typeof data === "string") return data || "Invalid email or password.";
  return data?.detail || data?.message || data?.error || data?.data?.detail || data?.data?.message || "Invalid email or password.";
}

function shouldTryWorkerFallback(err) {
  const status = err?.response?.status;
  if (!status) return true;
  return [404, 408, 422, 500, 502, 503, 504].includes(status);
}

function validStoredUser(user) {
  return Boolean(user && typeof user === "object" && (user.email || user.id || user._id || user.role || user.user_role || user.worker_id || user.business_id || user.businessId));
}

function readStoredAuthSnapshot(maxAgeMs = AUTH_SNAPSHOT_MAX_AGE_MS) {
  try {
    const raw = localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = Number(parsed?.at || 0);
    if (!at || Date.now() - at > maxAgeMs) return null;
    const storedUser = parsed?.user;
    if (!validStoredUser(storedUser)) return null;
    const storedToken = parsed?.token || localStorage.getItem("token") || "";
    return {
      ...storedUser,
      id: String(storedUser.id || storedUser._id || storedUser.business_id || storedUser.email || ""),
      email: String(storedUser.email || "").trim().toLowerCase(),
      business_id: String(storedUser.business_id || storedUser.businessId || storedUser.id || storedUser._id || ""),
      ...(storedToken ? { token: storedToken } : {}),
      restored_session: true,
    };
  } catch {
    return null;
  }
}

function saveStoredAuthSnapshot(user = {}) {
  if (!validStoredUser(user)) return;
  try {
    const token = user.token || localStorage.getItem("token") || "";
    const safeUser = { ...user };
    if (token) safeUser.token = token;
    localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({ at: Date.now(), token, user: safeUser }));
  } catch {}
}

function rememberPlatformOwner(nextUser = {}) {
  const finalEmail = String(nextUser.email || "").trim().toLowerCase();
  if (finalEmail === "hello@churvox.com" || nextUser?.is_platform_owner === true || nextUser?.is_admin === true) {
    try {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", finalEmail);
    } catch {}
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredAuthSnapshot());
  const [loading, setLoading] = useState(true);
  const authRunRef = useRef(0);

  const fetchMe = useCallback(async (token) => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: headersFor(token),
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    const nextToken = tokenFrom(response.data) || token || "";
    const nextUser = userFrom(response.data);
    if (!nextUser) throw new Error("No current user returned.");
    if (nextToken) nextUser.token = nextToken;
    return nextUser;
  }, []);

  const checkAuth = useCallback(async () => {
    const runId = ++authRunRef.current;
    let token = "";
    try { token = localStorage.getItem("token") || ""; } catch {}
    const storedSession = readStoredAuthSnapshot(AUTH_REFRESH_GRACE_MS);
    if (storedSession) setUser((current) => current || storedSession);

    try {
      const me = await fetchMe(token || storedSession?.token || undefined);
      if (me?.has_app_access || inferredWorker(me) || inferredPayroll(me) || hasValidPlan(me)) removePlanFlag();
      if (me?.token) localStorage.setItem("token", me.token);
      saveStoredAuthSnapshot(me);
      rememberPlatformOwner(me);
      if (runId === authRunRef.current) setUser(me);
      return me;
    } catch (err) {
      const status = err?.response?.status;
      if (storedSession && !status) {
        if (runId === authRunRef.current) setUser(storedSession);
        return storedSession;
      }
      if (status === 401 || status === 403) {
        clearStoredAuth();
        if (runId === authRunRef.current) setUser(null);
      }
      throw err;
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    checkAuth().catch(() => setLoading(false));
  }, [checkAuth]);

  useEffect(() => {
    const refreshAuthAfterBilling = () => {
      checkAuth().catch(() => {});
    };
    window.addEventListener("churvox-auth-refresh", refreshAuthAfterBilling);
    window.addEventListener("storage", refreshAuthAfterBilling);
    return () => {
      window.removeEventListener("churvox-auth-refresh", refreshAuthAfterBilling);
      window.removeEventListener("storage", refreshAuthAfterBilling);
    };
  }, [checkAuth]);

  async function workerLoginBridge(cleanEmail, password, originalError) {
    try {
      const response = await axios.post(
        `${API_BASE}/api/worker/auth/login`,
        { email: cleanEmail, password },
        { withCredentials: true, timeout: WORKER_AUTH_TIMEOUT_MS }
      );
      if (response.data?.success === false) throw new Error(authError(response.data));
      return response;
    } catch (workerErr) {
      const message = workerErr?.response?.data?.detail || workerErr?.response?.data?.message || workerErr?.message;
      const original = originalError?.response?.data?.detail || originalError?.response?.data?.message || originalError?.message;
      throw new Error(message || original || "Invalid email or password.");
    }
  }

  const login = useCallback(async (email, password) => {
    const runId = ++authRunRef.current;
    setLoading(true);
    clearStoredAuth();
    setUser(null);

    const cleanEmail = String(email || "").trim().toLowerCase();
    let response;
    let normalLoginError = null;

    try {
      try {
        response = await axios.post(
          `${API_BASE}/api/auth/login`,
          { email: cleanEmail, password },
          { withCredentials: true, timeout: AUTH_TIMEOUT_MS }
        );
      } catch (err) {
        normalLoginError = err;
        if (!shouldTryWorkerFallback(err)) throw err;
        response = await workerLoginBridge(cleanEmail, password, err);
      }

      if (response.data?.success === false) {
        try {
          response = await workerLoginBridge(cleanEmail, password, normalLoginError);
        } catch (err) {
          throw new Error(authError(response.data) || err.message);
        }
      }

      const token = tokenFrom(response.data);
      const nextUser = userFrom(response.data);

      if (!nextUser) {
        throw new Error("Login failed because the server did not return account JSON.");
      }

      const returnedEmail = String(nextUser.email || "").trim().toLowerCase();
      if (returnedEmail && returnedEmail !== cleanEmail) {
        throw new Error("Churvox returned a different account than the email entered.");
      }

      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }

      if (nextUser?.has_app_access || inferredWorker(nextUser) || inferredPayroll(nextUser) || hasValidPlan(nextUser)) removePlanFlag();
      saveStoredAuthSnapshot(nextUser);
      rememberPlatformOwner(nextUser);
      if (runId === authRunRef.current) setUser(nextUser);

      return { ...response.data, user: nextUser, ...nextUser };
    } catch (err) {
      if (runId === authRunRef.current) {
        clearStoredAuth();
        setUser(null);
      }
      throw err;
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    const runId = ++authRunRef.current;
    setLoading(true);
    clearStoredAuth();
    setUser(null);
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
      if (response.data?.success === false) throw new Error(authError(response.data));

      const token = tokenFrom(response.data);
      const nextUser = userFrom(response.data);
      if (!nextUser) throw new Error("Account was created but Churvox could not load the session.");

      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }

      localStorage.setItem(PLAN_REQUIRED_KEY, "true");
      const locked = { ...nextUser, plan: nextUser.plan || "none", has_app_access: false, billing_lock_reason: "choose_plan_in_stripe" };
      saveStoredAuthSnapshot(locked);
      if (runId === authRunRef.current) setUser(locked);
      return { ...response.data, user: locked, ...locked };
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const runId = ++authRunRef.current;
    try {
      const token = localStorage.getItem("token") || "";
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { headers: headersFor(token), withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    } catch {}
    clearStoredAuth();
    try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
    if (runId === authRunRef.current) {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email }, { timeout: AUTH_TIMEOUT_MS });
      return { success: true, email_sent: response.data.email_sent !== false };
    } catch (err) {
      return { success: false, error: err?.response?.data?.detail || "Failed to send reset link. Please try again." };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, { token, new_password: newPassword }, { timeout: AUTH_TIMEOUT_MS });
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.response?.data?.detail || "Failed to reset password." };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updates } : prev;
      if (next) saveStoredAuthSnapshot(next);
      return next;
    });
  }, []);

  const roleValue = rawRole(user || {});
  const isWorker = inferredWorker(user || {});
  const isPayroll = !isWorker && inferredPayroll(user || {});
  const normalizedRole = isWorker ? "worker" : isPayroll ? "payroll" : normalizeRole(roleValue);
  const isEmployer = !isWorker && !isPayroll && isBusinessRole(roleValue);
  const isOwnerUser = !isWorker && !isPayroll && isOwner(roleValue);

  const isTrialExpired = (() => {
    if (!user?.trial_ends_at) return false;
    if (String(user?.subscription_status || "").toLowerCase() === "active") return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  })();

  const hasAppAccess = (() => {
    if (!user) return false;
    if (isWorker || isPayroll) return true;

    const status = subscriptionStatus(user);
    const validPlan = hasValidPlan(user);
    if (validPlan && !isLockedStatus(status) && !isTrialExpired) return true;
    if (validPlan && GOOD_STATUSES.has(status) && !isTrialExpired) return true;

    if (typeof user.has_app_access === "boolean") return user.has_app_access;

    if (!validPlan) return false;
    if ((status === "trialing" || !status) && !isTrialExpired) return true;
    return false;
  })();

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, updateUser, forgotPassword, resetPassword, normalizedRole, isEmployer, isWorker, isPayroll, isOwnerUser, isTrialExpired, hasAppAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
