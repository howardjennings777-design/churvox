import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, AlertCircle, Loader2, Sparkles, ShieldCheck, Briefcase, Receipt, Users } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";
import { PremiumButton } from "@/components/premium";
import "@/styles/loginControlRoomTheme.css";

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner =
    email === "hello@churvox.com" ||
    user?.is_platform_owner === true ||
    user?.is_admin === true;
  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.token) {
        navigate(getPostLoginPath(result));
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div className="px-auth">
      <div className="px-auth__panel">
        <div className="px-auth__card">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="mb-3"><ChurvoxLogo size="lg" /></div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe7ff] text-[#1d4ed8] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> AI Work Queue
            </span>
            <h1 className="font-heading text-[28px] font-bold text-[#0d1b34] mt-4 leading-tight tracking-tight">Welcome back</h1>
            <p className="text-[14px] text-[#5b6c87] mt-2">Sign in to run jobs, clients, quotes, invoices and crew from one command hub.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-login-form" data-testid="login-form">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[#fff5f5] border border-[#fecaca] rounded-xl text-[#b91c1c] text-sm" data-testid="login-error">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-2">Email</label>
              <div className="relative px-login-input-wrap">
                <Mail className="px-login-input-icon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-input px-login-input"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d]">Password</label>
                <Link to="/forgot-password" className="text-[12.5px] font-semibold text-[#1d4ed8] hover:underline" data-testid="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <div className="relative px-login-input-wrap">
                <Lock className="px-login-input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-input px-login-input"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <PremiumButton
              type="submit"
              size="lg"
              className="w-full px-login-submit"
              disabled={loading}
              dataTestId="login-submit-button"
              iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            >
              {loading ? "Signing in…" : "Sign in"}
            </PremiumButton>
          </form>

          <p className="text-center text-[13px] text-[#5b6c87] mt-7">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-[#1d4ed8] hover:underline" data-testid="signup-link">Sign up</Link>
          </p>

          <div className="flex justify-center gap-6 mt-5 text-[11.5px] text-[#7d8ba3]">
            <Link to="/privacy" className="hover:text-[#5b6c87]" data-testid="login-privacy-link">Privacy</Link>
            <Link to="/terms" className="hover:text-[#5b6c87]" data-testid="login-terms-link">Terms</Link>
          </div>
        </div>
      </div>

      <div className="px-auth__brand">
        <div className="px-auth__brand-inner">
          <div className="inline-flex items-center justify-center"><ChurvoxLogo size="xl" /></div>
          <h2 className="px-auth__brand-title">Run your business from one AI Work Queue</h2>
          <p className="px-auth__brand-sub">
            Churvox prepares dispatch, proof, invoices, reminders, recurring work and customer updates. You approve. Churvox executes safely.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8 max-w-md mx-auto">
            <div className="rounded-2xl bg-white/70 border border-[#d8e3f3] p-4 backdrop-blur shadow-sm text-left">
              <div className="h-9 w-9 rounded-xl bg-[#dbe7ff] text-[#1d4ed8] inline-flex items-center justify-center"><Briefcase className="h-4 w-4" /></div>
              <p className="text-[13px] font-bold text-[#0d1b34] mt-2">Jobs & Dispatch</p>
              <p className="text-[12px] text-[#5b6c87] mt-1">Assign, track and complete</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-[#d8e3f3] p-4 backdrop-blur shadow-sm text-left">
              <div className="h-9 w-9 rounded-xl bg-[#ccfbf1] text-[#0d9488] inline-flex items-center justify-center"><Receipt className="h-4 w-4" /></div>
              <p className="text-[13px] font-bold text-[#0d1b34] mt-2">Quotes & Invoices</p>
              <p className="text-[12px] text-[#5b6c87] mt-1">Draft, approve and get paid</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-[#d8e3f3] p-4 backdrop-blur shadow-sm text-left">
              <div className="h-9 w-9 rounded-xl bg-[#ede4ff] text-[#7c3aed] inline-flex items-center justify-center"><Sparkles className="h-4 w-4" /></div>
              <p className="text-[13px] font-bold text-[#0d1b34] mt-2">AI Operator</p>
              <p className="text-[12px] text-[#5b6c87] mt-1">Approval-first actions</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-[#d8e3f3] p-4 backdrop-blur shadow-sm text-left">
              <div className="h-9 w-9 rounded-xl bg-[#fff1d6] text-[#d97706] inline-flex items-center justify-center"><Users className="h-4 w-4" /></div>
              <p className="text-[13px] font-bold text-[#0d1b34] mt-2">Crew & Payroll</p>
              <p className="text-[12px] text-[#5b6c87] mt-1">Roles, time and exports</p>
            </div>
          </div>

          <div className="px-auth__chips">
            <span className="px-auth__chip"><img src="/brand/churvox-mark.svg" alt="Churvox" className="h-10 w-10 rounded-2xl shadow-sm" />Approval-first AI</span>
            <span className="px-auth__chip">MYOB sync</span>
            <span className="px-auth__chip">Mobile-first</span>
            <span className="px-auth__chip">SMS reminders</span>
          </div>
        </div>
      </div>
    </div>
  );
}
