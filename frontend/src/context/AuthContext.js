import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios"
import { normalizePlan, getPlanFeatures } from "../utils/planRules";
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
import API_BASE from "../lib/apiBase";


const mapUserPlanData = (rawUser, tokenOverride = null) => {
  const normalizedPlan = normalizePlan(rawUser?.plan);
  const nextUser = {
    ...(rawUser || {}),
    plan: normalizedPlan,
    plan_features: rawUser?.plan_features || getPlanFeatures(normalizedPlan),
  };
  if (tokenOverride) nextUser.token = tokenOverride;
  return nextUser;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true,
      });
      setUser(mapUserPlanData(response.data, token));
    } catch (err) {
      try { localStorage.removeItem("token"); } catch (_) {}
      try { sessionStorage.removeItem("token"); } catch (_) {}
      try { localStorage.removeItem("owner_portal_session"); } catch (_) {}
      try { localStorage.removeItem("platform_owner_email"); } catch (_) {}
      setUser(null);
      console.error("Auth check failed", err?.response?.data || err?.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    window.addEventListener("churvox-auth-refresh", checkAuth);
    return () => window.removeEventListener("churvox-auth-refresh", checkAuth);
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password }, { withCredentials: true });
    const { token, ...userData } = response.data || {};
    if (token) localStorage.setItem("token", token);
    const nextUser = mapUserPlanData(userData, token || null);
    setUser(nextUser);
    return { ...nextUser, token };
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true });
    const { token, ...restData } = response.data || {};
    if (token) localStorage.setItem("token", token);
    const nextUser = mapUserPlanData(restData, token || null);
    setUser(nextUser);
    return { ...nextUser, token };
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
    } catch {}
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });
      return { success: true, token: response.data.debug_token || null };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.detail || "Failed to send reset link. Please try again.",
      };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, { token, new_password: newPassword });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.detail || "Failed to reset password.",
      };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const isEmployer =
    normalizedRole === "employer" ||
    normalizedRole === "admin" ||
    normalizedRole === "owner" ||
    normalizedRole === "superadmin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "business_owner" ||
    user?.is_admin === true ||
    user?.is_owner === true;
  const isWorker = normalizedRole === "worker";

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, updateUser, forgotPassword, resetPassword, isEmployer, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
