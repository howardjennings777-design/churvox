import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-semibold text-slate-900">Reset password</h1>
          <p className="text-muted-foreground mt-2">Enter your new password</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">New password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400" data-testid="reset-password-success">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Password reset successful!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now sign in with your new password.
                    </p>
                  </div>
                </div>

                <Link to="/login">
                  <Button className="w-full bg-primary hover:bg-primary/90" data-testid="go-to-login-button">
                    Go to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="reset-password-error">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {!searchParams.get("token") && (
                  <div className="space-y-2">
                    <Label htmlFor="token">Reset Token</Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="Paste your reset token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="bg-background border-border font-mono text-sm"
                      required
                      data-testid="reset-token-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-background border-border"
                      required
                      data-testid="reset-new-password-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-background border-border"
                      required
                      data-testid="reset-confirm-password-input"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                  data-testid="reset-password-submit-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>

                <Link to="/login" className="block">
                  <Button variant="ghost" className="w-full" data-testid="back-to-login-link">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
