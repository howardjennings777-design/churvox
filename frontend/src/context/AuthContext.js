import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

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

    if (
      email === "hello@churvox.com" ||
      userData?.role === "owner" ||
      userData?.role === "admin" ||
      userData?.is_owner === true ||
      userData?.is_admin === true ||
      userData?.is_platform_owner === true
    ) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", email);
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

  const isTrialExpired = (() => {
    if (!user) return false;
    if (user.stripe_subscription_id) return false;
    if (user.subscription_status === "active") return false;
    if (!user.trial_ends_at) return false;
    try {
      return new Date(user.trial_ends_at) < new Date();
    } catch {
      return false;
    }
  })();

  const hasAppAccess = (() => {
    if (!user) return false;
    if (isWorker || isPayroll) return true;
    const plan = (user.plan || "").toLowerCase();
    if (!plan || plan === "none") return false;
    if (user.stripe_subscription_id) return true;
    if (user.subscription_status === "active") return true;
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
        isTrialExpired,
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
