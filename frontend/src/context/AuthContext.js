import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE from "../lib/apiBase";
import { normalizeRole, isBusinessRole, isOwner, isWorkerRole, isPayrollRole } from "../lib/roles";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 30000;
const WORKER_AUTH_TIMEOUT_MS = 30000;
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const AUTH_SNAPSHOT_KEY = "churvox_auth_session_snapshot_v1";
const LOGGED_OUT_KEY = "churvox:logged-out";
const AUTH_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const WORKER_OFFLINE_GRACE_MS = 1000 * 60 * 60 * 2;
const BUSINESS_OFFLINE_GRACE_MS = 1000 * 60 * 15;
const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const AUTH_PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/worker/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/me",
  "/api/auth/logout",
];

function setAxiosAuthToken(token = "") {
  const cleanToken = String(token || "").trim();
  if (cleanToken) axios.defaults.headers.common.Authorization = `Bearer ${cleanToken}`;
  else delete axios.defaults.headers.common.Authorization;
}

function requestPath(value = "") {
  try { return new URL(String(value || ""), window.location.origin).pathname; }
  catch { return String(value || ""); }
}

function isPublicAuthRequest(value = "") {
  const path = requestPath(value);
  return AUTH_PUBLIC_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

function publishAuthState(status, nextUser = null) {
  if (typeof window === "undefined") return;
  const detail = Object.freeze({
    status,
    authenticated: status === "authenticated",
    role: String(nextUser?.role || nextUser?.user_role || ""),
    email: String(nextUser?.email || "").trim().toLowerCase(),
    at: Date.now(),
  });
  window.__CHURVOX_AUTH_STATE__ = detail;
  window.dispatchEvent(new CustomEvent("churvox-auth-state", { detail }));
}
const VALID_PLANS = new Set(["start", "solo", "crew", "team", "operator", "pro", "command", "enterprise"]);
const LOCKED_STATUSES = new Set(["cancelled", "canceled", "unpaid", "incomplete", "incomplete_expired", "locked", "disabled", "expired", "revoked"]);
const PAID_STATUSES = new Set(["active", "paid", "past_due", "trialing", "trial"]);
const ACCOUNT_CACHE_KEYS = [
  "churvox:stable-current-plan:v1",
  "churvox:plan-override",
  "churvox:addon:accounting_sync",
  "churvox:addon:command_growth_pack",
  "churvox:billing-plan",
];

function safeStorageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

function hasExplicitLogoutLock() {
  try { return Boolean(sessionStorage.getItem(LOGGED_OUT_KEY)); } catch { return false; }
}

function setExplicitLogoutLock() {
  try { sessionStorage.setItem(LOGGED_OUT_KEY, String(Date.now())); } catch {}
}

function clearExplicitLogoutLock() {
  try { sessionStorage.removeItem(LOGGED_OUT_KEY); } catch {}
}

function clearAccountPlanState() {
  ACCOUNT_CACHE_KEYS.forEach(safeStorageRemove);
}

function clearStoredAuth({ clearPlanState = false } = {}) {
  [
    "token",
    "authToken",
    "access_token",
    "owner_portal_session",
    "platform_owner_email",
    AUTH_SNAPSHOT_KEY,
  ].forEach(safeStorageRemove);
  setAxiosAuthToken("");
  if (clearPlanState) clearAccountPlanState();
}

function removePlanFlag() {
  safeStorageRemove(PLAN_REQUIRED_KEY);
}

function setPlanFlag() {
  try { localStorage.setItem(PLAN_REQUIRED_KEY, "true"); } catch {}
}

function cleanPlan(value) {
  return String(value || "").trim().toLowerCase();
}

function userPlan(user = {}) {
  return cleanPlan(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier || user.plan_name || user?.business?.plan || user?.business?.subscription_plan);
}

function hasValidPlan(user = {}) {
  return VALID_PLANS.has(userPlan(user));
}

function subscriptionStatus(user = {}) {
  return String(user.subscription_status || user.plan_status || user.billing_status || user.stripe_status || user.status || "").trim().toLowerCase();
}

function isLockedStatus(status) {
  return LOCKED_STATUSES.has(String(status || "").trim().toLowerCase());
}

function rawRole(user = {}) {
  const business = user?.business && typeof user.business === "object" ? user.business : {};
  for (const key of ["role", "user_role", "account_type", "staff_role", "worker_role", "type", "worker_type"]) {
    if (user.get?.(key)) return String(user.get(key)).trim().toLowerCase().replace(" ", "_").replace("-", "_");
  }
  return (
    user.role || user.user_role || user.account_role || user.member_role || user.team_role || user.staff_role || user.worker_role ||
    user.type || user.user_type || user.account_type || user.member_type || user.staff_type || user.worker_type ||
    business.role || business.user_role || business.member_role || ""
  );
}

function truthy(value) {
  if (typeof value === "string") return ["1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker", "granted", "verified"].includes(value.trim().toLowerCase());
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

function isPlatformOwner(user = {}) {
  return String(user?.email || "").trim().toLowerCase() === PLATFORM_OWNER_EMAIL;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken || data?.user?.token || data?.user?.access_token || data?.user?.accessToken || "";
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

function isTransientAuthError(error) {
  const status = error?.response?.status;
  return !status || [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function authDelay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withTransientAuthRetry(operation, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isTransientAuthError(error) || attempt === attempts) throw error;
      await authDelay([700, 1400, 2500, 4000, 6000][attempt - 1] || 6000);
    }
  }
  throw lastError || new Error("Authentication service unavailable.");
}

function shouldTryWorkerFallback(error) {
  const status = error?.response?.status;
  // Worker fallback is for a real identity/route rejection only. A network or
  // Render 5xx error must retry the same owner endpoint instead of pretending
  // the user may be a worker.
  return [401, 404, 422].includes(status);
}

function validStoredUser(user) {
  return Boolean(user && typeof user === "object" && (user.email || user.id || user._id || user.role || user.user_role || user.worker_id || user.business_id || user.businessId));
}

function readStoredAuthSnapshot(maxAgeMs = AUTH_SNAPSHOT_MAX_AGE_MS) {
  try {
    const raw = localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = Number(parsed?.at || 0);
    if (!at || Date.now() - at > maxAgeMs) return null;
    const storedUser = parsed?.user;
    if (!validStoredUser(storedUser)) return null;
    const storedToken = parsed?.token || localStorage.getItem("token") || "";
    return {
      ...storedUser,
      id: String(storedUser.id || storedUser._id || storedUser.business_id || storedUser.email || ""),
      email: String(storedUser.email || "").trim().toLowerCase(),
      business_id: String(storedUser.business_id || storedUser.businessId || storedUser.id || storedUser._id || ""),
      ...(storedToken ? { token: storedToken } : {}),
      restored_session: true,
      restored_at: at,
    };
  } catch {
    return null;
  }
}

function saveStoredAuthSnapshot(user = {}) {
  if (!validStoredUser(user)) return;
  try {
    const token = user.token || localStorage.getItem("token") || "";
    const safeUser = { ...user };
    if (token) safeUser.token = token;
    localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({ at: Date.now(), token, user: safeUser }));
  } catch {}
}

function rememberPlatformOwner(nextUser = {}) {
  const email = String(nextUser.email || "").trim().toLowerCase();
  if (email === PLATFORM_OWNER_EMAIL) {
    try {
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", email);
    } catch {}
  } else {
    safeStorageRemove("owner_portal_session");
    safeStorageRemove("platform_owner_email");
  }
}

function explicitBillingLock(user = {}) {
  const status = subscriptionStatus(user);
  return Boolean(
    isLockedStatus(status) ||
    user.billing_lock_reason ||
    user.locked_reason ||
    user.account_locked === true ||
    user.has_app_access === false
  );
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function testerAccess(user = {}) {
  if (explicitBillingLock(user)) return false;
  const tester = user?.free_tester_access === true || user?.is_tester === true || subscriptionStatus(user) === "tester_free";
  if (!tester) return false;
  const until = parseDate(user?.free_tester_until || user?.free_until);
  return !until || until > new Date();
}

function manualAccessProof(user = {}) {
  return Boolean(
    truthy(user?.manual_access_granted_by_app_owner) ||
    truthy(user?.access_granted_by_app_owner) ||
    truthy(user?.billing_verified) ||
    truthy(user?.subscription_verified) ||
    truthy(user?.checkout_verified_by_stripe)
  );
}

function stripeBackedAccess(user = {}) {
  return Boolean(
    user?.stripe_subscription_id ||
    user?.stripe_customer_id ||
    user?.stripe_checkout_session_id ||
    user?.checkout_session_id ||
    manualAccessProof(user)
  );
}

function businessAccessFromUser(user = {}) {
  if (!user) return false;
  if (isPlatformOwner(user)) return true;
  if (inferredWorker(user) || inferredPayroll(user)) return !explicitBillingLock(user);
  if (explicitBillingLock(user)) return false;
  if (user.email_verified === false) return false;
  if (testerAccess(user)) return true;

  const status = subscriptionStatus(user);
  const trialEnd = parseDate(user.trial_ends_at);
  if (["trial", "trialing"].includes(status) && trialEnd && trialEnd <= new Date()) return false;
  // /api/auth/me is the authoritative billing gate and may omit private Stripe identifiers.
  if (user.has_app_access === true) return true;
  if (PAID_STATUSES.has(status)) return stripeBackedAccess(user);
  if (hasValidPlan(user)) return stripeBackedAccess(user);
  return false;
}

function offlineWorkerSnapshot(user = {}) {
  return inferredWorker(user) && !explicitBillingLock(user) && !isPlatformOwner(user);
}

function offlineBusinessSnapshot(user = {}) {
  return !inferredWorker(user) && !inferredPayroll(user) && businessAccessFromUser(user);
}

export function AuthProvider({ children }) {
  // Cached account data is fallback evidence only; it must never render a protected app before /api/auth/me succeeds.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authRunRef = useRef(0);

  const fetchMe = useCallback(async (token) => withTransientAuthRetry(async () => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: headersFor(token),
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    const nextToken = tokenFrom(response.data) || token || "";
    const nextUser = userFrom(response.data);
    if (!nextUser) {
      const error = new Error("No current user returned.");
      error.response = { status: 503 };
      throw error;
    }
    if (nextToken) nextUser.token = nextToken;
    return nextUser;
  }, 4), []);

  const checkAuth = useCallback(async ({ allowOfflineFallback = true } = {}) => {
    const runId = ++authRunRef.current;
    if (hasExplicitLogoutLock()) {
      clearStoredAuth({ clearPlanState: true });
      publishAuthState("anonymous");
      if (runId === authRunRef.current) {
        setUser(null);
        setLoading(false);
      }
      return null;
    }
    publishAuthState("checking");
    let token = "";
    try { token = localStorage.getItem("token") || ""; } catch {}
    const workerSession = readStoredAuthSnapshot(WORKER_OFFLINE_GRACE_MS);
    const businessSession = readStoredAuthSnapshot(BUSINESS_OFFLINE_GRACE_MS);
    const fallbackSession = workerSession || businessSession;
    const requestToken = token || fallbackSession?.token || "";
    setAxiosAuthToken(requestToken);

    try {
      const me = await fetchMe(requestToken || undefined);
      if (businessAccessFromUser(me)) removePlanFlag();
      if (me?.token) localStorage.setItem("token", me.token);
      setAxiosAuthToken(me?.token || requestToken);
      saveStoredAuthSnapshot(me);
      rememberPlatformOwner(me);
      publishAuthState("authenticated", me);
      if (runId === authRunRef.current) setUser(me);
      return me;
    } catch (error) {
      const status = error?.response?.status;
      const transient = !status || status === 408 || status === 429 || status >= 500;
      if (allowOfflineFallback && transient && workerSession && offlineWorkerSnapshot(workerSession)) {
        setAxiosAuthToken(workerSession.token || requestToken);
        publishAuthState("authenticated", workerSession);
        if (runId === authRunRef.current) setUser(workerSession);
        return workerSession;
      }
      if (allowOfflineFallback && transient && businessSession && offlineBusinessSnapshot(businessSession)) {
        setAxiosAuthToken(businessSession.token || requestToken);
        publishAuthState("authenticated", businessSession);
        if (runId === authRunRef.current) setUser(businessSession);
        return businessSession;
      }
      if (status === 401 || status === 403) clearStoredAuth({ clearPlanState: true });
      publishAuthState("anonymous");
      if (runId === authRunRef.current) setUser(null);
      throw error;
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    const release = window.setTimeout(() => setLoading(false), AUTH_TIMEOUT_MS + 750);
    checkAuth().catch(() => setLoading(false)).finally(() => window.clearTimeout(release));
    return () => window.clearTimeout(release);
  }, [checkAuth]);

  useEffect(() => {
    const refreshAuth = () => checkAuth().catch(() => {});
    window.addEventListener("churvox-auth-refresh", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("churvox-auth-refresh", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, [checkAuth]);


  useEffect(() => {
    const expireSession = () => {
      ++authRunRef.current;
      clearStoredAuth({ clearPlanState: true });
      setUser(null);
      setLoading(false);
      publishAuthState("anonymous");
    };
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || "";
        if (status === 401 && !isPublicAuthRequest(url)) {
          window.dispatchEvent(new Event("churvox-auth-expired"));
        }
        return Promise.reject(error);
      }
    );
    window.addEventListener("churvox-auth-expired", expireSession);
    return () => {
      axios.interceptors.response.eject(interceptor);
      window.removeEventListener("churvox-auth-expired", expireSession);
    };
  }, []);

  async function workerLoginBridge(cleanEmail, password, originalError) {
    try {
      const response = await withTransientAuthRetry(() => axios.post(
        `${API_BASE}/api/worker/auth/login`,
        { email: cleanEmail, password },
        { withCredentials: true, timeout: WORKER_AUTH_TIMEOUT_MS }
      ), 5);
      if (response.data?.success === false) throw new Error(authError(response.data));
      return response;
    } catch (workerError) {
      const message = workerError?.response?.data?.detail || workerError?.response?.data?.message || workerError?.message;
      const original = originalError?.response?.data?.detail || originalError?.response?.data?.message || originalError?.message;
      const error = new Error(message || original || "Invalid email or password.");
      error.response = workerError?.response || originalError?.response;
      throw error;
    }
  }

  const login = useCallback(async (email, password, options = {}) => {
    const runId = ++authRunRef.current;
    const confirmSession = options?.confirmSession === true;
    clearExplicitLogoutLock();
    publishAuthState("checking");
    setLoading(true);
    clearStoredAuth({ clearPlanState: true });
    setUser(null);

    const cleanEmail = String(email || "").trim().toLowerCase();
    let response;
    let normalLoginError = null;

    try {
      try {
        response = await withTransientAuthRetry(() => axios.post(
          `${API_BASE}/api/auth/login`,
          { email: cleanEmail, password },
          { withCredentials: true, timeout: AUTH_TIMEOUT_MS }
        ), 5);
      } catch (error) {
        normalLoginError = error;
        if (!shouldTryWorkerFallback(error)) throw error;
        response = await workerLoginBridge(cleanEmail, password, error);
      }

      if (response.data?.success === false) {
        response = await workerLoginBridge(cleanEmail, password, normalLoginError);
      }

      const token = tokenFrom(response.data);
      const nextUser = userFrom(response.data);
      if (!nextUser) throw new Error("Login failed because the server did not return account JSON.");

      const returnedEmail = String(nextUser.email || "").trim().toLowerCase();
      if (returnedEmail && returnedEmail !== cleanEmail) throw new Error("Churvox returned a different account than the email entered.");

      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }
      setAxiosAuthToken(token);

      if (businessAccessFromUser(nextUser)) removePlanFlag();
      if (confirmSession) {
        publishAuthState("checking");
      } else {
        saveStoredAuthSnapshot(nextUser);
        rememberPlatformOwner(nextUser);
        publishAuthState("authenticated", nextUser);
        if (runId === authRunRef.current) setUser(nextUser);
      }
      return { ...response.data, user: nextUser, ...nextUser };
    } catch (error) {
      if (runId === authRunRef.current) {
        clearStoredAuth({ clearPlanState: true });
        if (confirmSession) setExplicitLogoutLock();
        setUser(null);
        publishAuthState("anonymous");
      }
      throw error;
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
    setLoading(true);
    clearStoredAuth({ clearPlanState: true });
    setUser(null);
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true, timeout: AUTH_TIMEOUT_MS });
      if (response.data?.success === false) throw new Error(authError(response.data));

      const token = tokenFrom(response.data);
      const nextUser = userFrom(response.data);
      if (!nextUser) throw new Error("Account was created but Churvox could not load the session.");

      if (token) {
        nextUser.token = token;
        localStorage.setItem("token", token);
      } else {
        safeStorageRemove("token");
      }
      setAxiosAuthToken(token);

      if (testerAccess(nextUser) || inferredWorker(nextUser) || inferredPayroll(nextUser)) {
        removePlanFlag();
        saveStoredAuthSnapshot(nextUser);
        publishAuthState("authenticated", nextUser);
        if (runId === authRunRef.current) setUser(nextUser);
        return { ...response.data, user: nextUser, ...nextUser };
      }

      setPlanFlag();
      const locked = { ...nextUser, plan: nextUser.plan || "none", has_app_access: false, billing_lock_reason: "choose_plan_in_stripe" };
      saveStoredAuthSnapshot(locked);
      publishAuthState("authenticated", locked);
      if (runId === authRunRef.current) setUser(locked);
      return { ...response.data, user: locked, ...locked };
    } finally {
      if (runId === authRunRef.current) setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const runId = ++authRunRef.current;
    setExplicitLogoutLock();
    clearStoredAuth({ clearPlanState: true });
    publishAuthState("anonymous");
    if (runId === authRunRef.current) {
      setUser(null);
      setLoading(false);
    }
    try {
      const token = localStorage.getItem("token") || "";
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { headers: headersFor(token), withCredentials: true, timeout: AUTH_TIMEOUT_MS });
    } catch {}
    clearStoredAuth({ clearPlanState: true });
    safeStorageRemove(PLAN_REQUIRED_KEY);
    publishAuthState("anonymous");
    if (runId === authRunRef.current) {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email }, { timeout: AUTH_TIMEOUT_MS });
      return { success: true, email_sent: response.data?.email_sent !== false };
    } catch (error) {
      if (error?.response?.status === 429) return { success: false, error: "Too many reset requests. Please wait 15 minutes and try again." };
      return { success: false, error: error?.response?.data?.detail || "Failed to send reset link. Please try again." };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, { token, new_password: newPassword }, { timeout: AUTH_TIMEOUT_MS });
      clearStoredAuth({ clearPlanState: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.response?.data?.detail || "Failed to reset password." };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((previous) => {
      const next = previous ? { ...previous, ...updates } : previous;
      if (next) saveStoredAuthSnapshot(next);
      return next;
    });
  }, []);

  const roleValue = rawRole(user || {});
  const isWorker = inferredWorker(user || {});
  const isPayroll = !isWorker && inferredPayroll(user || {});
  const normalizedRole = isWorker ? "worker" : isPayroll ? "payroll" : normalizeRole(roleValue);
  const isEmployer = !isWorker && !isPayroll && isBusinessRole(roleValue);
  const isOwnerUser = !isWorker && !isPayroll && isOwner(roleValue);

  const isTrialExpired = (() => {
    if (!user?.trial_ends_at) return false;
    const status = subscriptionStatus(user);
    if (["active", "paid", "past_due"].includes(status)) return false;
    const end = parseDate(user.trial_ends_at);
    return Boolean(end && end < new Date());
  })();

  const hasAppAccess = (() => {
    if (!user || isTrialExpired) return false;
    return businessAccessFromUser(user);
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
