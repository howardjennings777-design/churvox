#!/usr/bin/env python3
"""Apply paid-account billing, login confirmation and explicit logout hardening."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    return text.replace(old, new, 1)


def patch_auth_context():
    path = ROOT / "frontend/src/context/AuthContext.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'const AUTH_SNAPSHOT_KEY = "churvox_auth_session_snapshot_v1";\n',
        'const AUTH_SNAPSHOT_KEY = "churvox_auth_session_snapshot_v1";\nconst LOGGED_OUT_KEY = "churvox:logged-out";\n',
        "logged-out key",
    )
    text = replace_once(
        text,
        '''function safeStorageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}
''',
        '''function safeStorageRemove(key) {
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
''',
        "logout lock helpers",
    )
    text = replace_once(
        text,
        '''  const checkAuth = useCallback(async () => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
    let token = "";
''',
        '''  const checkAuth = useCallback(async ({ allowOfflineFallback = true } = {}) => {
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
''',
        "strict checkAuth signature",
    )
    text = replace_once(
        text,
        '      if (transient && workerSession && offlineWorkerSnapshot(workerSession)) {\n',
        '      if (allowOfflineFallback && transient && workerSession && offlineWorkerSnapshot(workerSession)) {\n',
        "worker fallback guard",
    )
    text = replace_once(
        text,
        '      if (transient && businessSession && offlineBusinessSnapshot(businessSession)) {\n',
        '      if (allowOfflineFallback && transient && businessSession && offlineBusinessSnapshot(businessSession)) {\n',
        "business fallback guard",
    )
    text = replace_once(
        text,
        '''  const login = useCallback(async (email, password) => {
    const runId = ++authRunRef.current;
    publishAuthState("checking");
''',
        '''  const login = useCallback(async (email, password, options = {}) => {
    const runId = ++authRunRef.current;
    const confirmSession = options?.confirmSession === true;
    clearExplicitLogoutLock();
    publishAuthState("checking");
''',
        "deferred login signature",
    )
    text = replace_once(
        text,
        '''      if (businessAccessFromUser(nextUser)) removePlanFlag();
      saveStoredAuthSnapshot(nextUser);
      rememberPlatformOwner(nextUser);
      publishAuthState("authenticated", nextUser);
      if (runId === authRunRef.current) setUser(nextUser);
      return { ...response.data, user: nextUser, ...nextUser };
''',
        '''      if (businessAccessFromUser(nextUser)) removePlanFlag();
      if (confirmSession) {
        publishAuthState("checking");
      } else {
        saveStoredAuthSnapshot(nextUser);
        rememberPlatformOwner(nextUser);
        publishAuthState("authenticated", nextUser);
        if (runId === authRunRef.current) setUser(nextUser);
      }
      return { ...response.data, user: nextUser, ...nextUser };
''',
        "deferred login publication",
    )
    text = replace_once(
        text,
        '''      if (runId === authRunRef.current) {
        clearStoredAuth({ clearPlanState: true });
        setUser(null);
        publishAuthState("anonymous");
      }
      throw error;
''',
        '''      if (runId === authRunRef.current) {
        clearStoredAuth({ clearPlanState: true });
        if (confirmSession) setExplicitLogoutLock();
        setUser(null);
        publishAuthState("anonymous");
      }
      throw error;
''',
        "failed login lock",
    )
    text = replace_once(
        text,
        '''  const logout = useCallback(async () => {
    const runId = ++authRunRef.current;
    try {
''',
        '''  const logout = useCallback(async () => {
    const runId = ++authRunRef.current;
    setExplicitLogoutLock();
    clearStoredAuth({ clearPlanState: true });
    publishAuthState("anonymous");
    if (runId === authRunRef.current) {
      setUser(null);
      setLoading(false);
    }
    try {
''',
        "logout lock before request",
    )
    path.write_text(text, encoding="utf-8")


def patch_login_page():
    path = ROOT / "frontend/src/pages/auth/LoginPage.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'const result = await withTimeout(login(cleanEmail, password), LOGIN_TIMEOUT_MS, "Login service did not respond in time.");',
        'const result = await withTimeout(login(cleanEmail, password, { confirmSession: true }), LOGIN_TIMEOUT_MS, "Login service did not respond in time.");',
        "confirmed login call",
    )
    text = replace_once(
        text,
        'freshUser = await withTimeout(checkAuth(), ACCESS_REFRESH_TIMEOUT_MS, "Your session could not be confirmed. Please sign in again.");',
        'freshUser = await withTimeout(checkAuth({ allowOfflineFallback: false }), ACCESS_REFRESH_TIMEOUT_MS, "Your session could not be confirmed. Please sign in again.");',
        "strict post-login auth check",
    )
    path.write_text(text, encoding="utf-8")


def patch_owner_logout():
    path = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'import { ScheduleScreen, AutomationScreen, PayrollScreen, BrandingScreen } from "./OfficeTeamBackOfficeScreens";\n',
        'import { ScheduleScreen, AutomationScreen, PayrollScreen, BrandingScreen } from "./OfficeTeamBackOfficeScreens";\nimport { doLogout as performVisibleLogout } from "../runtime/churvoxVisibleLogoutRuntime";\n',
        "owner logout runtime import",
    )
    text = replace_once(
        text,
        'function logoutOffice() { try { localStorage.removeItem("token"); localStorage.removeItem("owner_portal_session"); localStorage.removeItem("platform_owner_email"); sessionStorage.clear(); } catch {} window.location.href = "/login"; }',
        'function logoutOffice(event) { performVisibleLogout(event?.currentTarget).catch(() => { try { sessionStorage.setItem("churvox:logged-out", String(Date.now())); } catch {} window.location.replace("/login?logged_out=1"); }); }',
        "native owner logout",
    )
    path.write_text(text, encoding="utf-8")


def patch_plans():
    path = ROOT / "frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '''  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
''',
        '''  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingAccount, setBillingAccount] = useState({ loading: true, hasStripeCustomer: false, hasSubscription: false, status: "", currentPlan: "" });
''',
        "billing account state",
    )
    text = replace_once(
        text,
        '''  }, []);

  async function openBilling() {
''',
        '''  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBillingAccount() {
      try {
        const response = await fetch(apiUrl("/billing/subscription-status"), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...tokenHeaders() },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || "Billing status unavailable");
        const source = billingAccountSource(body);
        if (!cancelled) setBillingAccount({
          loading: false,
          hasStripeCustomer: Boolean(source.stripe_customer_id || source.stripeCustomerId),
          hasSubscription: Boolean(source.stripe_subscription_id || source.stripeSubscriptionId),
          status: String(source.subscription_status || source.billing_status || source.stripe_status || source.status || "").trim().toLowerCase(),
          currentPlan: normalizePlanKey(source.ui_plan || source.current_plan || source.plan || source.subscription_plan || source.billing_plan || source.tier || ""),
        });
      } catch {
        if (!cancelled) setBillingAccount((current) => ({ ...current, loading: false }));
      }
    }
    loadBillingAccount();
    return () => { cancelled = true; };
  }, []);

  async function openBillingPortal() {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingError("");
    try {
      const response = await fetch(apiUrl("/billing/create-portal-session"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...tokenHeaders() },
        body: JSON.stringify({ return_url: `${window.location.origin}/dashboard#plans`, source: "owner_plans_manage_billing" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Billing portal returned HTTP ${response.status}`);
      const portalUrl = body?.url || body?.portal_url || body?.session_url || body?.data?.url;
      if (!portalUrl) throw new Error("Stripe billing portal URL was not returned.");
      const secureUrl = new URL(portalUrl, window.location.origin);
      if (secureUrl.protocol !== "https:") throw new Error("Billing portal did not return a secure URL.");
      window.location.assign(secureUrl.toString());
    } catch (error) {
      setBillingError(error?.message || "Billing management could not open. No plan was changed and nothing was charged.");
      setBillingBusy(false);
    }
  }

  async function openBilling() {
''',
        "billing status and portal flow",
    )
    text = replace_once(
        text,
        '''      <section className="cvPlanBillingAction">
        <div>
          <span>Secure checkout</span>
          <h3>Continue with {plan.name}</h3>
          <p>Open Stripe Checkout for the selected plan. You return to this new Plans screen after checkout or cancellation.</p>
          {billingError ? <small className="cvPlanBillingError" role="alert">{billingError}</small> : null}
        </div>
        <button type="button" onClick={openBilling} disabled={billingBusy}>{billingBusy ? "Opening Stripe…" : "Continue to secure checkout"}</button>
      </section>
''',
        '''      <section className="cvPlanBillingAction">
        <div>
          <span>{billingAccount.hasStripeCustomer ? "Current subscription" : "Secure checkout"}</span>
          <h3>{billingAccount.hasStripeCustomer ? `${displayPlanName(billingAccount.currentPlan || currentPlan)} billing` : `Continue with ${plan.name}`}</h3>
          <p>{billingAccount.hasStripeCustomer ? "Open Stripe’s secure customer portal to update payment details, review invoices or manage the current subscription. Churvox does not change the plan until Stripe confirms it." : "Open Stripe Checkout for the selected plan. You return to this new Plans screen after checkout or cancellation."}</p>
          {billingAccount.hasStripeCustomer && billingAccount.status ? <small>Subscription status: {billingAccount.status.replaceAll("_", " ")}</small> : null}
          {billingError ? <small className="cvPlanBillingError" role="alert">{billingError}</small> : null}
        </div>
        {billingAccount.hasStripeCustomer
          ? <button type="button" onClick={openBillingPortal} disabled={billingBusy}>{billingBusy ? "Opening Stripe…" : "Manage billing"}</button>
          : <button type="button" onClick={openBilling} disabled={billingBusy || billingAccount.loading}>{billingBusy ? "Opening Stripe…" : billingAccount.loading ? "Checking billing…" : "Continue to secure checkout"}</button>}
      </section>
''',
        "billing action render",
    )
    text = replace_once(
        text,
        '''function normalizePlanKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  return { solo: "start", start: "start", team: "crew", crew: "crew", pro: "operator", operator: "operator", enterprise: "command", command: "command" }[raw] || "";
}
''',
        '''function normalizePlanKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  return { solo: "start", start: "start", team: "crew", crew: "crew", pro: "operator", operator: "operator", enterprise: "command", command: "command" }[raw] || "";
}

function displayPlanName(value) {
  const plan = normalizePlanKey(value);
  return { start: "Start", crew: "Crew", operator: "Operator", command: "Command" }[plan] || "Current plan";
}

function billingAccountSource(body = {}) {
  const nested = body?.user || body?.account || body?.subscription || body?.data;
  return nested && typeof nested === "object" ? { ...body, ...nested } : body;
}
''',
        "billing helper functions",
    )
    path.write_text(text, encoding="utf-8")


def main():
    patch_auth_context()
    patch_login_page()
    patch_owner_logout()
    patch_plans()
    print("Paid account boundary fixes applied.")


if __name__ == "__main__":
    main()
