import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await forgotPassword(email);

    if (result.success) {
      setSuccess(true);
      if (result.token) {
        setResetToken(result.token);
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-semibold text-white font-heading">Forgot password?</h1>
          <p className="text-muted-foreground mt-2">We'll send you a reset link</p>
        </div>

        <Card className="bg-[#12141D] border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">Reset password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400" data-testid="forgot-password-success">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Reset link sent!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check your email for the password reset link.
                    </p>
                  </div>
                </div>

                {resetToken && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Testing Mode:</strong> Use this token to reset your password:
                    </p>
                    <code className="block p-2 bg-background rounded text-xs break-all text-primary" data-testid="reset-token">
                      {resetToken}
                    </code>
                    <Link 
                      to={`/reset-password?token=${resetToken}`}
                      className="mt-3 inline-block text-sm text-primary hover:text-primary/80"
                      data-testid="reset-password-link"
                    >
                      Click here to reset password →
                    </Link>
                  </div>
                )}

                <Link to="/login">
                  <Button variant="outline" className="w-full border-border" data-testid="back-to-login-button">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="forgot-password-error">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-background border-border"
                      required
                      data-testid="forgot-password-email-input"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                  data-testid="forgot-password-submit-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
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
