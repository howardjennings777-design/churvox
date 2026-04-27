import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, Loader2, ShieldCheck, Zap, BriefcaseBusiness } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";

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
    <div className="cx-auth-shell lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <div className="cx-auth-panel p-6 md:p-10 lg:p-14 flex items-center justify-center">
        <div className="cx-auth-card w-full max-w-lg rounded-[28px] p-6 md:p-8 shadow-[0_18px_50px_rgba(20,32,48,0.12)]">
          <div className="mb-7 flex items-center justify-between gap-3">
            <ChurvoxLogo size="md" />
            <span className="text-xs uppercase tracking-[0.14em] text-slate-500 font-semibold">Secure Login</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-slate-600">Sign in to your Churvox Smart Hub.</p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" data-testid="login-error">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700" data-testid="forgot-password-link">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-button">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in to Churvox"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Don&apos;t have an account? <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold" data-testid="signup-link">Create one</Link>
          </p>

          <div className="flex justify-center gap-4 mt-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-700" data-testid="login-privacy-link">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-700" data-testid="login-terms-link">Terms</Link>
          </div>
        </div>
      </div>

      <aside className="hidden lg:flex p-10 xl:p-14">
        <div className="w-full rounded-[30px] border border-slate-200 bg-gradient-to-br from-[#0f1f35] to-[#1a365f] p-10 text-white shadow-[0_24px_56px_rgba(14,24,41,0.28)]">
          <div className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs uppercase tracking-[0.14em]">Field Service OS</div>
          <h2 className="mt-6 text-4xl font-semibold leading-tight">One premium hub for operations, payroll and automation.</h2>
          <p className="mt-5 text-blue-50/95 text-lg">
            Run jobs, teams, quotes, invoices, time, payroll and automation from one powerful field-service hub.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4"><BriefcaseBusiness className="h-4 w-4 mb-2" />Live jobs, dispatch, and client activity</div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4"><Zap className="h-4 w-4 mb-2" />Automation workflows and notifications</div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4"><ShieldCheck className="h-4 w-4 mb-2" />Secure access and role-based control</div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4">Ready for quotes, invoices and payroll exports</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
