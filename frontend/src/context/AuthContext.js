import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      setUser(response.data);
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
    localStorage.setItem("token", response.data.token);
    setUser(response.data);
    return response.data;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData, { withCredentials: true });
    localStorage.setItem("token", response.data.token);
    setUser(response.data);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch {}
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const isEmployer = user?.role === "employer" || user?.role === "admin";
  const isWorker = user?.role === "worker";

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, updateUser, isEmployer, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
