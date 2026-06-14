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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (token) => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    return response.data;
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await fetchMe(token);
      if (me?.has_app_access) removePlanRequiredFlag();
      setUser({ ...me, token });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("owner_portal_session");
      localStorage.removeItem("platform_owner_email");
      setUser(null);
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
    const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password }, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    const token = response?.data?.token || response?.data?.access_token || response?.data?.auth_token || null;
    const fallbackUser = response?.data?.user ? response.data.user : response.data;
    if (!token) throw new Error("No token returned from login.");
    localStorage.setItem("token", token);

    let nextUser = fallbackUser;
    try { nextUser = await fetchMe(token); } catch {}
    if (nextUser?.has_app_access) removePlanRequiredFlag();
    setUser({ ...nextUser, token });

    const cleanEmail = String(email || nextUser?.email || "").toLowerCase();
    if (cleanEmail === "hello@churvox.com" || nextUser?.is_platform_owner === true) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", cleanEmail);
    }
    return { ...response.data, ...nextUser, token };
  }, [fetchMe]);

  const register = useCallback(async (userData) => {
    const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    const token = response?.data?.token || response?.data?.access_token || response?.data?.auth_token || null;
    const restData = response?.data?.user ? response.data.user : response.data;
    if (!token) throw new Error("No token returned from register.");
    localStorage.setItem("token", token);
    localStorage.setItem(PLAN_REQUIRED_KEY, "true");
    setUser({ ...restData, token, plan: "none", has_app_access: false, billing_lock_reason: "choose_plan_in_stripe" });
    return { ...response.data, token };
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
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
