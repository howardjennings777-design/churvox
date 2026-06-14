import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = React.useState("Verifying your email…");
  const [ok, setOk] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    async function verify() {
      const token = params.get("token") || "";
      if (!token) {
        setStatus("This verification link is missing its token. Please request a new verification email.");
        setDone(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email/${encodeURIComponent(token)}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.message || "Verification failed");
        try {
          window.localStorage.setItem("churvox_email_verified", "true");
          window.dispatchEvent(new Event("churvox-auth-refresh"));
          await checkAuth?.();
        } catch {}
        if (!alive) return;
        setOk(true);
        setStatus("Email verified. Churvox is refreshing your account now.");
        setTimeout(() => navigate("/plans", { replace: true }), 1200);
      } catch (err) {
        if (!alive) return;
        setStatus(err?.message || "This verification link is invalid or expired. Please request a new one.");
      } finally {
        if (alive) setDone(true);
      }
    }
    verify();
    return () => { alive = false; };
  }, [checkAuth, navigate, params]);

  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-8">
      <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center">
        <article className="w-full rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
          <div className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ok ? "Verified" : "Email verification"}</div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] md:text-6xl">{ok ? "Email verified" : "Checking your link"}</h1>
          <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-600">{status}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/plans" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">Continue</Link>
            {!ok && done ? <Link to="/login" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Back to login</Link> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
