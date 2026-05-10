import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { PremiumButton } from "@/components/premium";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await forgotPassword(email);
    if (result.success) setSuccess(true);
    else setError(result.error);
    setLoading(false);
  };

  return (
    <div className="px-auth" style= gridTemplateColumns: '1fr' >
      <div className="px-auth__panel">
        <div className="px-auth__card">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4"><ChurvoxLogo size="lg" /></div>
            <h1 className="font-heading text-[26px] font-bold text-[#0d1b34]">Forgot password?</h1>
            <p className="text-[14px] text-[#5b6c87] mt-1">We’ll send you a reset link via email.</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0]" data-testid="forgot-password-success">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#15803d] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0d1b34]">Reset link sent</p>
                  <p className="text-[13px] text-[#5b6c87] mt-1">If an account exists, you’ll receive a password reset email shortly.</p>
                </div>
              </div>
              <Link to="/login"><PremiumButton variant="secondary" className="w-full" iconLeft={<ArrowLeft className="h-4 w-4" />} dataTestId="back-to-login-button">Back to login</PremiumButton></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#fff5f5] border border-[#fecaca] rounded-xl text-[#b91c1c] text-sm" data-testid="forgot-password-error">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                  <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="px-input pl-10" required data-testid="forgot-password-email-input" />
                </div>
              </div>
              <PremiumButton type="submit" size="lg" className="w-full" disabled={loading} dataTestId="forgot-password-submit-button"
                iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}>
                {loading ? "Sending…" : "Send reset link"}
              </PremiumButton>
              <Link to="/login" className="block"><PremiumButton variant="ghost" className="w-full" iconLeft={<ArrowLeft className="h-4 w-4" />} dataTestId="back-to-login-link">Back to login</PremiumButton></Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
