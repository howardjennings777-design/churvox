import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 15000;
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";

function clearStoredAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
  } catch {}
}

function removePlanFlag() {
  try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
}

function tokenFrom(data = {}) {
  return data.token || data.access_token || data.auth_token || data.jwt || data.data?.token || data.data?.access_token || data.user?.token || data.user?.access_token || "";
}

function userFrom(data = {}) {
  const picked = data.user || data.data?.user || data.account || data.data || data || {};
  return picked.user && !picked.email && !picked.id && !picked._id ? picked.user : picked;
}

function looksUser(value = {}) {
  return Boolean(value && typeof value === "object" && (value.email || value.id || value._id || value.role || value.business_id || value.businessId));
}

function cleanUser(data = {}, token = "") {
  const raw = userFrom(data);
  if (!looksUser(raw)) return null;
  const id = raw.id || raw._id || data.id || data._id || "";
  const businessId = raw.business_id || raw.businessId || data.business_id || data.businessId || id;
  const next = { ...data, ...raw, id: String(id || ""), business_id: businessId ? String(businessId) : "" };
  delete next.password_hash;
  delete next.hashed_password;
  delete next.password;
  if (token) next.token = token;
  else next.cookieSession = true;
  return next;
}

function headersFor(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function permanentAuthError(err) {
  const code = err?.response?.status;
  return code === 401 || code === 403;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (token) => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: headersFor(token),
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    const nextToken = tokenFrom(response.data) || token || "";
    const nextUser = cleanUser(response.data, nextToken);
    if (!nextUser) throw new Error("No current user returned.");
    return nextUser;
  }, []);

  const checkAuth = useCallback(async () => {
    let token = "";
    try { token = localStorage.getItem("token") || ""; } catch {}
    try {
      const me = await fetchMe(token || undefined);
      if (me?.has_app_access) removePlanFlag();
      setUser(me);
      return me;
    } catch (err) {
      if (permanentAuthError(err)) {
        clearStoredAuth();
        setUser(null);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => { checkAuth().catch(() => {}); }, [checkAuth]);

  useEffect(() => {
    const refresh = () => { setLoading(true); checkAuth().catch(() => {}); };
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
    const response = await axios.post(`${API_BASE}/api/auth/login`, { email: cleanEmail, password }, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    if (response.data?.success === false) throw new Error(response.data?.detail || response.data?.message || "Invalid email or password.");
    const token = tokenFrom(response.data);
    const nextUser = cleanUser(response.data, token);
    const returnedEmail = String(nextUser?.email || response.data?.email || "").trim().toLowerCase();
    if (!nextUser || returnedEmail !== cleanEmail) throw new Error("Login failed because Churvox could not confirm the account returned by the server.");
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    if (nextUser?.has_app_access) removePlanFlag();
    setUser(nextUser);
    const finalEmail = String(nextUser.email || "").trim().toLowerCase();
    if (finalEmail === "hello@churvox.com" || nextUser?.is_platform_owner === true || nextUser?.is_admin === true) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", finalEmail);
    }
    fetchMe(token || undefined).then((fresh) => setUser(fresh)).catch(() => {});
    return { ...response.data, user: nextUser, ...nextUser };
  }, [fetchMe]);

  const register = useCallback(async (userData) => {
    clearStoredAuth();
    setUser(null);
    const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    const token = tokenFrom(response.data);
    const nextUser = cleanUser(response.data, token);
    if (!nextUser) throw new Error("Account was created but Churvox could not load the session.");
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    localStorage.setItem(PLAN_REQUIRED_KEY, "true");
    const locked = { ...nextUser, plan: nextUser.plan || "none", has_app_access: false, billing_lock_reason: "choose_plan_in_stripe" };
    setUser(locked);
    return { ...response.data, user: locked, ...locked };
  }, []);

  const logout = useCallback(async () => {
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

  const updateUser = useCallback((updates) => setUser((prev) => (prev ? { ...prev, ...updates } : prev)), []);

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
    if (!plan || plan === "none" || plan === "free") return false;
    if (status === "active" || status === "paid") return true;
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
