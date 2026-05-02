import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, User, Building2, AlertCircle, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { PremiumButton } from "@/components/premium";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "", business_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        business_name: formData.business_name || null,
      });
      if (result?.token) navigate("/plans");
      else setError("Registration failed. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  const features = [
    "Schedule and track jobs across any trade",
    "Manage clients, quotes and invoices",
    "Public quote / invoice links + Pay Now",
    "AI assistant drafts customer messages",
    "Crew, payroll, MYOB and SMS reminders",
  ];

  return (
    <div className="px-auth">
      <div className="px-auth__brand">
        <div className="px-auth__brand-inner text-left">
          <div className="flex items-center justify-center mb-4"><ChurvoxLogo size="xl" /></div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe7ff] text-[#1d4ed8] text-[11px] font-bold uppercase tracking-wider mx-auto">
            <Sparkles className="h-3 w-3" /> Free trial
          </span>
          <h2 className="px-auth__brand-title">Run your trade business smarter</h2>
          <p className="px-auth__brand-sub">Built for plumbers, electricians, builders, sparkies and every tradie running a small or growing crew.</p>
          <ul className="mt-8 space-y-3 max-w-md mx-auto">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-[14px] text-[#1a2c4d]">
                <CheckCircle className="h-5 w-5 text-[#0d9488] flex-shrink-0" /><span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-auth__panel">
        <div className="px-auth__card">
          <div className="text-center mb-7 lg:hidden">
            <div className="inline-flex items-center justify-center mb-3"><ChurvoxLogo size="lg" /></div>
          </div>
          <h1 className="font-heading text-[26px] font-bold text-[#0d1b34]">Create your account</h1>
          <p className="text-[14px] text-[#5b6c87] mt-1">Get started with Churvox in under a minute.</p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[#fff5f5] border border-[#fecaca] rounded-xl text-[#b91c1c] text-sm" data-testid="signup-error">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                <input name="name" value={formData.name} onChange={handleChange} placeholder="John Smith" className="px-input pl-10" required data-testid="signup-name-input" />
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="px-input pl-10" required data-testid="signup-email-input" />
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Business name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                <input name="business_name" value={formData.business_name} onChange={handleChange} placeholder="Smith Plumbing Pty Ltd" className="px-input pl-10" data-testid="signup-business-input" />
              </div>
              <p className="text-[11.5px] text-[#7d8ba3] mt-1">Appears on quotes and invoices.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                  <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="px-input pl-10" required data-testid="signup-password-input" />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                  <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="px-input pl-10" required data-testid="signup-confirm-password-input" />
                </div>
              </div>
            </div>

            <PremiumButton type="submit" size="lg" className="w-full" disabled={loading} dataTestId="signup-submit-button"
              iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}>
              {loading ? "Creating account…" : "Create account"}
            </PremiumButton>
          </form>

          <p className="text-center text-[13px] text-[#5b6c87] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#1d4ed8] hover:underline" data-testid="login-link">Sign in</Link>
          </p>
          <p className="text-center text-[11.5px] text-[#7d8ba3] mt-3">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-[#5b6c87]" data-testid="signup-terms-link">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-[#5b6c87]" data-testid="signup-privacy-link">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
