import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const PLATFORM_OWNER_EMAIL = "hello@churvox.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUser({ ...response.data, token });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("owner_portal_session");
      localStorage.removeItem("platform_owner_email");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleAuthRefresh = () => {
      checkAuth();
    };

    window.addEventListener("churvox-auth-refresh", handleAuthRefresh);
    return () => window.removeEventListener("churvox-auth-refresh", handleAuthRefresh);
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(
      `${API_BASE}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );

    const token =
      response?.data?.token ||
      response?.data?.access_token ||
      response?.data?.auth_token ||
      null;

    const userData = response?.data?.user ? response.data.user : response.data;

    if (!token) {
      throw new Error("No token returned from login.");
    }

    localStorage.setItem("token", token);
    setUser({ ...userData, token });

    const loginEmail = String(userData?.email || email || "").trim().toLowerCase();
    if (loginEmail === PLATFORM_OWNER_EMAIL) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", PLATFORM_OWNER_EMAIL);
    } else {
      localStorage.removeItem("owner_portal_session");
      localStorage.removeItem("platform_owner_email");
    }

    return { ...response.data, token };
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(
      `${API_BASE}/api/auth/register`,
      userData,
      { withCredentials: true }
    );

    const token =
      response?.data?.token ||
      response?.data?.access_token ||
      response?.data?.auth_token ||
      null;

    const restData = response?.data?.user ? response.data.user : response.data;

    if (!token) {
      throw new Error("No token returned from register.");
    }

    localStorage.setItem("token", token);
    setUser({ ...restData, token });

    return { ...response.data, token };
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });
      return {
        success: true,
        email_sent: response.data.email_sent !== false,
      };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.detail || "Failed to send reset link. Please try again.",
      };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, {
        token,
        new_password: newPassword,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.detail || "Failed to reset password.",
      };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const normalizedRole = normalizeRole(user?.role);
  const isEmployer = isBusinessRole(user?.role);
  const isWorker = isWorkerRole(user?.role);
  const isPayroll = isPayrollRole(user?.role);
  const isOwnerUser = isOwner(user?.role);

  const isPaidActive = (() => {
    if (!user) return false;
    const subscriptionStatus = String(user.subscription_status || "").toLowerCase();
    const planStatus = String(user.plan_status || "").toLowerCase();
    return Boolean(user.stripe_subscription_id) || subscriptionStatus === "active" || planStatus === "active" || planStatus === "paid";
  })();

  const isTrialExpired = (() => {
    if (!user) return false;
    if (isPaidActive) return false;
    if (!user.trial_ends_at) return false;
    try {
      return new Date(user.trial_ends_at) < new Date();
    } catch {
      return false;
    }
  })();

  const mustChoosePlan = (() => {
    if (!user) return false;
    if (isWorker || isPayroll) return false;
    const plan = String(user.plan || "").toLowerCase();
    if (!plan || plan === "none") return true;
    return isTrialExpired && !isPaidActive;
  })();

  const hasAppAccess = (() => {
    if (!user) return false;
    if (isWorker || isPayroll) return true;
    const plan = String(user.plan || "").toLowerCase();
    if (!plan || plan === "none") return false;
    if (isPaidActive) return true;
    if (isTrialExpired) return false;
    return true;
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        updateUser,
        forgotPassword,
        resetPassword,
        normalizedRole,
        isEmployer,
        isWorker,
        isPayroll,
        isOwnerUser,
        isPaidActive,
        isTrialExpired,
        mustChoosePlan,
        hasAppAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
