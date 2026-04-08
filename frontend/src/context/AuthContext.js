import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios"
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const API_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://churvox.onrender.com").replace(/\/$/, "");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true,
      });
      setUser({ ...response.data, token });
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password }, { withCredentials: true });
    const { token, ...userData } = response.data;
    localStorage.setItem("token", token);
    setUser({ ...userData, token });
    return response.data;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData, { withCredentials: true });
    const { token, ...restData } = response.data;
    localStorage.setItem("token", token);
    setUser({ ...restData, token });
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
    } catch {}
    localStorage.removeItem("token");
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
      await axios.post(`${API_URL}/api/auth/reset-password`, { token, new_password: newPassword });
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

  const isEmployer = user?.role === "employer" || user?.role === "admin";
  const isWorker = user?.role === "worker";

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
