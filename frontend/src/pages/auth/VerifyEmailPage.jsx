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
  const status = String(user?.subscription_status || user?.billing_status || "").trim().toLowerCase();
  const worker = /worker|staff|field_worker|technician|subcontractor/.test(role) || truthy(user?.is_worker) || truthy(user?.worker_account) || user?.worker_id;
  const tester = truthy(user?.free_tester_access) || truthy(user?.is_tester) || status === "tester_free";
  const active = truthy(user?.has_app_access) || tester || ["active", "paid", "trialing", "trial"].includes(status);

  if (email === PLATFORM_OWNER_EMAIL) return "/admin";
  if (worker) return "/worker/today";
  if (tester) return "/setup-guide?first_setup=1&tester=1&business_profile=1";
  if (active) return "/dashboard";
  return "/plans";
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = React.useState("Verifying your email…");
  const [ok, setOk] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [destination, setDestination] = React.useState("/login?verified=1");
  const redirectTimer = React.useRef(null);

  React.useEffect(() => {
    let alive = true;

    async function verify() {
      const token = params.get("token") || "";
      if (!token) {
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

        let currentUser = body?.user || body?.data?.user || null;
        try {
          window.localStorage.setItem("churvox_email_verified", "true");
          window.dispatchEvent(new Event("churvox-auth-refresh"));
          const refreshed = await checkAuth?.();
          if (refreshed) currentUser = refreshed?.user || refreshed;
        } catch {}

        if (!alive) return;
        const next = currentUser ? verifiedDestination(currentUser) : "/login?verified=1";
        setDestination(next);
        setOk(true);
        setStatus(currentUser ? "Email verified. Opening the right Churvox workspace now." : "Email verified. Sign in to continue.");
        redirectTimer.current = window.setTimeout(() => navigate(next, { replace: true }), 1400);
      } catch (error) {
        if (!alive) return;
        setStatus(error?.message || "This verification link is invalid or expired. Request a new one or contact support.");
      } finally {
        if (alive) setDone(true);
      }
    }

    verify();
    return () => {
      alive = false;
      window.clearTimeout(redirectTimer.current);
    };
  }, [checkAuth, navigate, params]);

  return (
    <main className="cp26Site" data-version="CHURVOX_EMAIL_VERIFICATION_PAID_LAUNCH_20260712">
      <PublicNav />
      <section className="min-h-[68vh] bg-[#f7f3ea] p-4 text-slate-950 md:p-8">
        <div className="mx-auto grid min-h-[64vh] max-w-3xl place-items-center">
          <article className="w-full rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
            <div className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ok ? "Verified" : "Email verification"}</div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] md:text-6xl">{ok ? "Email verified" : "Checking your link"}</h1>
            <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-600">{status}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={destination} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">{ok ? "Continue to Churvox" : "Sign in"}</Link>
              {!ok && done ? <Link to="/forgot-password" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Account help</Link> : null}
              {!ok && done ? <Link to="/support" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Contact support</Link> : null}
            </div>
          </article>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
