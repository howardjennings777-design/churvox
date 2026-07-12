import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import { PublicNav, PublicFooter } from "../marketing/ChurvoxPublicShell";

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";

function truthy(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return ["1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"].includes(String(value || "").trim().toLowerCase());
}

function verifiedDestination(user = {}) {
  const email = String(user?.email || "").trim().toLowerCase();
  const role = String(user?.role || user?.user_role || user?.account_type || user?.worker_role || "").trim().toLowerCase();
  const status = String(user?.subscription_status || user?.billing_status || user?.stripe_status || "").trim().toLowerCase();
  const worker = /worker|staff|field_worker|technician|subcontractor/.test(role) || truthy(user?.is_worker) || truthy(user?.worker_account) || user?.worker_id;
  const tester = truthy(user?.free_tester_access) || truthy(user?.is_tester) || status === "tester_free";
  const billingProof = Boolean(user?.stripe_subscription_id || user?.stripe_customer_id || user?.stripe_checkout_session_id || user?.checkout_session_id || user?.manual_access_granted_by_app_owner || user?.access_granted_by_app_owner);
  const active = user?.has_app_access === true || tester || (billingProof && ["active", "paid", "trialing", "trial", "past_due"].includes(status));

  if (email === PLATFORM_OWNER_EMAIL) return "/admin";
  if (worker) return "/worker/today";
  if (tester) return "/setup-guide?first_setup=1&tester=1&business_profile=1";
  if (active) return "/dashboard";
  return "/plans";
}

function authToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function safeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function hasSafeSubscription(user = {}) {
  const status = String(user?.subscription_status || user?.billing_status || user?.stripe_status || "").trim().toLowerCase();
  const proof = Boolean(
    user?.stripe_subscription_id ||
    user?.stripe_customer_id ||
    user?.stripe_checkout_session_id ||
    user?.checkout_session_id
  );
  return proof && ["trial", "trialing", "active", "paid", "past_due"].includes(status);
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const token = params.get("token") || "";
  const pending = params.get("pending") === "1";
  const email = safeEmail(params.get("email"));

  const [status, setStatus] = React.useState(pending && !token ? "Check your inbox and open the verification link from Churvox." : "Verifying your email…");
  const [ok, setOk] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [pendingMode, setPendingMode] = React.useState(pending && !token);
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState("");
  const [destination, setDestination] = React.useState("/login?verified=1");
  const redirectTimer = React.useRef(null);

  const finishVerified = React.useCallback((currentUser, delay = 900) => {
    const next = currentUser ? verifiedDestination(currentUser) : "/login?verified=1";
    setDestination(next);
    setOk(true);
    setDone(true);
    setPendingMode(false);
    setStatus(currentUser ? (next === "/plans" ? "Email verified. Choose and confirm a plan to continue." : "Email verified. Opening the right Churvox workspace now.") : "Email verified. Sign in to continue.");
    window.clearTimeout(redirectTimer.current);
    redirectTimer.current = window.setTimeout(() => navigate(next, { replace: true }), delay);
  }, [navigate]);

  React.useEffect(() => {
    let alive = true;

    async function currentSession() {
      try {
        const refreshed = await checkAuth?.();
        const currentUser = refreshed?.user || refreshed || null;
        return alive ? currentUser : null;
      } catch {
        return null;
      }
    }

    async function verify() {
      if (!token) {
        if (pending) {
          const currentUser = await currentSession();
          if (!alive) return;
          if (currentUser?.email_verified === true) {
            finishVerified(currentUser);
            return;
          }
          setPendingMode(true);
          setDone(true);
          setStatus(
            hasSafeSubscription(currentUser)
              ? "Your subscription is safe. Verify your email to open Churvox. You can request another verification email below."
              : "Check your inbox and open the verification link from Churvox. You can safely request another email below."
          );
          return;
        }
        setStatus("This verification link is missing its token. Request a new verification email or contact support.");
        setDone(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/verify-email/${encodeURIComponent(token)}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || "Verification failed");

        try {
          localStorage.setItem("churvox_email_verified", "true");
          window.dispatchEvent(new Event("churvox-auth-refresh"));
        } catch {}
        const currentUser = body?.user || body?.data?.user || await currentSession();
        if (alive) finishVerified(currentUser, 1400);
      } catch (error) {
        if (!alive) return;
        setStatus(error?.message || "This verification link is invalid or expired. Request a new one or contact support.");
        setDone(true);
      }
    }

    verify();
    return () => {
      alive = false;
      window.clearTimeout(redirectTimer.current);
    };
  }, [checkAuth, finishVerified, pending, token]);

  async function resendVerification() {
    if (resending) return;
    setResending(true);
    setResendMessage("");
    try {
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      const storedToken = authToken();
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
      const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(email ? { email } : {}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || "The verification request failed.");

      if (body?.email_verified === true) {
        const refreshed = await checkAuth?.().catch(() => null);
        finishVerified(refreshed?.user || refreshed || null);
        return;
      }
      if (body?.email_verification_sent !== true) throw new Error(body?.detail || body?.message || "The verification email could not be confirmed as sent.");
      setResendMessage("Verification email sent. Check your inbox and spam folder.");
    } catch (error) {
      setResendMessage(error?.message || "The verification email could not be sent. Try again or contact support.");
    } finally {
      setResending(false);
    }
  }

  const heading = ok ? "Email verified" : pendingMode ? "Verify your email" : "Checking your link";
  const badge = ok ? "Verified" : pendingMode ? "Action needed" : "Email verification";

  return (
    <main className="cp26Site" data-version="CHURVOX_EMAIL_VERIFICATION_LOGIN_FLOW_20260712C">
      <PublicNav />
      <section className="min-h-[68vh] bg-[#f7f3ea] p-4 text-slate-950 md:p-8">
        <div className="mx-auto grid min-h-[64vh] max-w-3xl place-items-center">
          <article className="w-full rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
            <div className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{badge}</div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] md:text-6xl">{heading}</h1>
            <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-600" role="status" aria-live="polite">{status}</p>
            {resendMessage ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800" role="status">{resendMessage}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {pendingMode ? <button type="button" onClick={resendVerification} disabled={resending} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">{resending ? "Sending…" : "Resend verification email"}</button> : null}
              {ok ? <Link to={destination} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">Continue to Churvox</Link> : null}
              {!ok && done ? <Link to="/login" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Back to login</Link> : null}
              {!ok && done ? <Link to="/support" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Contact support</Link> : null}
            </div>
          </article>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
