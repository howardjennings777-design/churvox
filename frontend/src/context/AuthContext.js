import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AUTH_TIMEOUT_MS = 12000;
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const AuthContext = createContext(null);

function removePlanRequiredFlag() {
  try { window.localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
}

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("access_token");
  localStorage.removeItem("owner_portal_session");
  localStorage.removeItem("platform_owner_email");
}

function authFailedPermanently(err) {
  const status = err?.response?.status;
  return status === 401 || status === 403;
}

function pickToken(payload = {}) {
  return (
    payload?.token ||
    payload?.access_token ||
    payload?.auth_token ||
    payload?.jwt ||
    payload?.data?.token ||
    payload?.data?.access_token ||
    payload?.data?.auth_token ||
    payload?.session?.token ||
    payload?.session?.access_token ||
    payload?.user?.token ||
    payload?.user?.access_token ||
    null
  );
}

function pickUser(payload = {}) {
  return payload?.user || payload?.data?.user || payload?.account || payload?.data || payload || {};
}

function looksLikeUser(value = {}) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.email || value.id || value._id || value.role || value.business_id || value.businessId)
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers,
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    return pickUser(response.data);
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await fetchMe(token);
      if (!looksLikeUser(me)) throw new Error("No current user returned.");
      if (me?.has_app_access) removePlanRequiredFlag();
      setUser({ ...me, ...(token ? { token } : {}) });
    } catch (err) {
      if (authFailedPermanently(err)) {
        clearStoredAuth();
        setUser(null);
      } else {
        setUser((prev) => prev || null);
      }
    } finally { setLoading(false); }
  }, [fetchMe]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    const refresh = () => { setLoading(true); checkAuth(); };
    window.addEventListener("churvox-auth-refresh", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("churvox-auth-refresh", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    clearStoredAuth();
    setUser(null);

    const cleanEmail = String(email || "").trim().toLowerCase();

    const response = await axios.post(
      `${API_BASE}/api/auth/login`,
      { email: cleanEmail, password },
      { withCredentials: true, timeout: AUTH_TIMEOUT_MS }
    );

    const token = pickToken(response.data);
    let nextUser = pickUser(response.data);
    const returnedEmail = String(nextUser?.email || response.data?.email || "").trim().toLowerCase();

    if (!token && (!returnedEmail || returnedEmail !== cleanEmail)) {
      clearStoredAuth();
      throw new Error(response?.data?.detail || response?.data?.message || "Invalid email or password.");
    }

    if (token) {
      localStorage.setItem("token", token);
      try {
        nextUser = await fetchMe(token);
      } catch {
        if (!looksLikeUser(nextUser)) {
          clearStoredAuth();
          throw new Error("Login succeeded but Churvox could not load your account yet. Please refresh and try again.");
        }
      }
    }

    const finalEmail = String(nextUser?.email || returnedEmail || "").trim().toLowerCase();

    if (!finalEmail || finalEmail !== cleanEmail) {
      clearStoredAuth();
      throw new Error("Login session mismatch. Please try again.");
    }

    if (nextUser?.has_app_access) removePlanRequiredFlag();

    setUser({ ...nextUser, ...(token ? { token } : {}) });

    if (finalEmail === "hello@churvox.com" || nextUser?.is_platform_owner === true || nextUser?.is_admin === true) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", finalEmail);
    }

    return { ...response.data, user: nextUser, ...nextUser, ...(token ? { token } : { cookieSession: true }) };
  }, [fetchMe]);

  const register = useCallback(async (userData) => {
    clearStoredAuth();
    setUser(null);
    const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    const token = pickToken(response.data);
    const restData = pickUser(response.data);
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    localStorage.setItem(PLAN_REQUIRED_KEY, "true");
    setUser({ ...restData, ...(token ? { token } : {}), plan: "none", has_app_access: false, billing_lock_reason: "choose_plan_in_stripe" });
    return { ...response.data, user: restData, ...(token ? { token } : { cookieSession: true }) };
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    } catch {}
    clearStoredAuth();
    localStorage.removeItem(PLAN_REQUIRED_KEY);
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

  const updateUser = useCallback((updates) => { setUser((prev) => (prev ? { ...prev, ...updates } : prev)); }, []);

  const normalizedRole = normalizeRole(user?.role);
  const isEmployer = isBusinessRole(user?.role);
  const isWorker = isWorkerRole(user?.role);
  const isPayroll = isPayrollRole(user?.role);
  const isOwnerUser = isOwner(user?.role);

  const isTrialExpired = (() => {
    if (!user?.trial_ends_at) return false;
    if (String(user?.subscription_status || "").toLowerCase() === "active") return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  })();

  const hasAppAccess = (() => {
    if (!user) return false;
    if (isWorker || isPayroll) return true;
    if (typeof user.has_app_access === "boolean") return user.has_app_access;
    const status = String(user.subscription_status || "").toLowerCase();
    const plan = String(user.plan || "").toLowerCase();
    if (!plan || plan === "none") return false;
    if (status === "active" || status === "paid") return true;
    if (status === "trialing" && !isTrialExpired) return true;
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
