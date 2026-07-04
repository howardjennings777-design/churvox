import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 15000;
const WORKER_AUTH_TIMEOUT_MS = 10000;
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const SESSION_CACHE_KEY = "churvox_last_valid_user";
const SESSION_CACHE_MAX_MS = 1000 * 60 * 60 * 24 * 14;
const VALID_PLANS = new Set(["start", "solo", "crew", "team", "operator", "pro", "command", "enterprise"]);
const GOOD_STATUSES = new Set(["active", "paid", "trialing", "trial", "past_due", "tester_free", "worker"]);

function clearStoredAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {}
}

function removePlanFlag() {
  try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
}

function cleanPlan(value) {
  return String(value || "").trim().toLowerCase();
}

function userPlan(user = {}) {
  return cleanPlan(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier || user.plan_name || user?.business?.plan || user?.business?.subscription_plan || "");
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
  return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || "";
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
  return [400, 401, 403, 404, 408, 422, 500, 502, 503, 504].includes(status);
}

function readCachedUser() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.saved_at || 0);
    if (!savedAt || Date.now() - savedAt > SESSION_CACHE_MAX_MS) {
      localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    const cached = userFrom(parsed?.user || parsed);
    if (!cached?.email) return null;
    const token = parsed?.token || cached.token || localStorage.getItem("token") || "";
    if (token) cached.token = token;
    return cached;
  } catch {
    return null;
  }
}

function rememberUser(user) {
  try {
    const safe = userFrom(user);
    if (!safe?.email) return;
    const token = safe.token || localStorage.getItem("token") || "";
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ saved_at: Date.now(), token, user: safe }));
    if (token) localStorage.setItem("token", token);
    const email = String(safe.email || "").toLowerCase();
    if (email === "hello@churvox.com" || safe?.is_platform_owner === true || safe?.is_admin === true) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", email);
    }
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);
  const loginAbortRef = useRef(null);
  const registerAbortRef = useRef(null);

  const fetchMe = useCallback(async (token) => {
    // IMPORTANT: If no token is provided, this will fail with 422 on the backend
    // because the Authorization header will be missing or invalid
    if (!token) {
      throw new Error("No authentication token available");
    }

    try {
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
    } catch (err) {
      // Log 422 errors specifically for debugging
      if (err?.response?.status === 422) {
        console.error("Auth 422 error - possible missing/invalid token:", {
          token: token ? `${token.slice(0, 20)}...` : "null",
          detail: err.response?.data?.detail,
        });
      }
      throw err;
    }
  }, []);

  const checkAuth = useCallback(async ({ force = false } = {}) => {
    let token = "";
    let cached = null;
    try {
      cached = readCachedUser();
      token = localStorage.getItem("token") || cached?.token || "";
    } catch {}

    if (cached?.email && !force) {
      setUser(cached);
      setLoading(false);
      return cached;
    }

    if (!token && !cached?.email) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const me = await fetchMe(token || undefined);
      if (me?.has_app_access || inferredWorker(me) || inferredPayroll(me) || hasValidPlan(me)) removePlanFlag();
      rememberUser(me);
      setUser(me);
      return me;
    } catch (err) {
      const status = err?.response?.status;
      if (cached?.email && [401, 403, 408, 422, 429, 500, 502, 503, 504].includes(Number(status || 0))) {
        setUser(cached);
        return cached;
      }
      if (status === 401 || status === 403 || status === 422) {
        clearStoredAuth();
        setUser(null);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    checkAuth().catch(() => {});
  }, [checkAuth]);

  useEffect(() => {
    const refreshAuthAfterBilling = () => {
      checkAuth({ force: true }).catch(() => {});
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
    // Abort previous login if one is in progress
    if (loginAbortRef.current) {
      loginAbortRef.current.abort();
    }

    const controller = new AbortController();
    loginAbortRef.current = controller;

    try {
      clearStoredAuth();
      setUser(null);

      const cleanEmail = String(email || "").trim().toLowerCase();
      let response;
      let normalLoginError = null;

      try {
        response = await axios.post(
          `${API_BASE}/api/auth/login`,
          { email: cleanEmail, password },
          { withCredentials: true, timeout: AUTH_TIMEOUT_MS, signal: controller.signal }
        );
      } catch (err) {
        if (err.name === "CanceledError") throw err;
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
      rememberUser(nextUser);
      setUser(nextUser);

      return { ...response.data, user: nextUser, ...nextUser };
    } finally {
      loginAbortRef.current = null;
    }
  }, []);

  const register = useCallback(async (userData) => {
    // Abort previous register if one is in progress
    if (registerAbortRef.current) {
      registerAbortRef.current.abort();
    }

    const controller = new AbortController();
    registerAbortRef.current = controller;

    try {
      clearStoredAuth();
      setUser(null);
      const response = await axios.post(`${API_BASE}/api/auth/register`, userData, {
        withCredentials: true,
        timeout: AUTH_TIMEOUT_MS,
        signal: controller.signal,
      });
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
      rememberUser(locked);
      setUser(locked);
      return { ...response.data, user: locked, ...locked };
    } finally {
      registerAbortRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    // Abort any in-progress auth operations
    if (loginAbortRef.current) loginAbortRef.current.abort();
    if (registerAbortRef.current) registerAbortRef.current.abort();

    try {
      const token = localStorage.getItem("token") || "";
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { headers: headersFor(token), withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    } catch {}
    clearStoredAuth();
    try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
    setUser(null);
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

  const updateUser = useCallback((updates) => setUser((prev) => {
    const next = prev ? { ...prev, ...updates } : prev;
    if (next) rememberUser(next);
    return next;
  }), []);

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
