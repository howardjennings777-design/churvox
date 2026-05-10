import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { PremiumButton } from "@/components/premium";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Reset token is required"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const result = await resetPassword(token, password);
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
            <h1 className="font-heading text-[26px] font-bold text-[#0d1b34]">Reset password</h1>
            <p className="text-[14px] text-[#5b6c87] mt-1">Choose a strong password for your account.</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0]" data-testid="reset-password-success">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#15803d] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0d1b34]">Password reset successful</p>
                  <p className="text-[13px] text-[#5b6c87] mt-1">You can now sign in with your new password.</p>
                </div>
              </div>
              <Link to="/login"><PremiumButton size="lg" className="w-full" dataTestId="go-to-login-button">Go to login</PremiumButton></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#fff5f5] border border-[#fecaca] rounded-xl text-[#b91c1c] text-sm" data-testid="reset-password-error">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              {!searchParams.get("token") && (
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Reset token</label>
                  <input type="text" placeholder="Paste your reset token" value={token} onChange={(e) => setToken(e.target.value)} className="px-input font-mono text-[13px]" required data-testid="reset-token-input" />
                </div>
              )}
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="px-input pl-10" required data-testid="reset-new-password-input" />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1a2c4d] mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
                  <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="px-input pl-10" required data-testid="reset-confirm-password-input" />
                </div>
              </div>
              <PremiumButton type="submit" size="lg" className="w-full" disabled={loading} dataTestId="reset-password-submit-button"
                iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}>
                {loading ? "Resetting…" : "Reset password"}
              </PremiumButton>
              <Link to="/login" className="block"><PremiumButton variant="ghost" className="w-full" iconLeft={<ArrowLeft className="h-4 w-4" />} dataTestId="back-to-login-link">Back to login</PremiumButton></Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
