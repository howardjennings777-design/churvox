import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

const RAW_API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_BACKEND_URL) ||
  "https://churvox-backend.onrender.com";

const API_URL = RAW_API_URL.replace(/\/$/, "");

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
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUser({ ...response.data, token });
    } catch (err) {
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

  const login = useCallback(async (email, password) => {
    const response = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );

    const token =
      response?.data?.token ||
      response?.data?.access_token ||
      response?.data?.auth_token ||
      null;

    const userData = response?.data?.user
      ? response.data.user
      : response.data;

    if (!token) {
      throw new Error("Login succeeded but no token was returned.");
    }

    localStorage.setItem("token", token);

    const mergedUser = { ...userData, token };
    setUser(mergedUser);

    if (
      email === "hello@churvox.com" ||
      mergedUser?.role === "owner" ||
      mergedUser?.role === "admin" ||
      mergedUser?.is_owner === true ||
      mergedUser?.is_admin === true ||
      mergedUser?.is_platform_owner === true
    ) {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", email);
    }

    return { ...response.data, token };
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(
      `${API_URL}/api/auth/register`,
      userData,
      { withCredentials: true }
    );

    const token =
      response?.data?.token ||
      response?.data?.access_token ||
      response?.data?.auth_token ||
      null;

    const restData = response?.data?.user
      ? response.data.user
      : response.data;

    if (!token) {
      throw new Error("Registration succeeded but no token was returned.");
    }

    localStorage.setItem("token", token);
    setUser({ ...restData, token });

    return { ...response.data, token };
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
    } catch (err) {}

    localStorage.removeItem("token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
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
      await axios.post(`${API_URL}/api/auth/reset-password`, {
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

  const isEmployer =
    user?.role === "employer" ||
    user?.role === "admin" ||
    user?.role === "owner";

  const isWorker = user?.role === "worker";

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
        isEmployer,
        isWorker,
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
