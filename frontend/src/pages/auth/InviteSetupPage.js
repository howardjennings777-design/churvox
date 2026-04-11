import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios"
axios.defaults.withCredentials = true;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, AlertCircle, Loader2, CheckCircle, User } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

import API_BASE from "../lib/apiBase";

export default function InviteSetupPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  
  const [actionLoading, setActionLoading] = useState(false);
const [inviteData, setInviteData] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await axios.get(`${API_BASE}/api/invite/verify/${token}`);
        setInviteData(res.data);
        setName(res.data.name || "");
      } catch (err) {
        setVerifyError(err?.response?.data?.detail || "Invalid or expired invite link.");
      } finally {
        setVerifying(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/invite/accept`, {
        token,
        password,
        name: name || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to set up account.");
    }
    setLoading(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="invite-loading">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-error-page">
        <div className="w-full max-w-md text-center">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Invite Link Invalid</h2>
              <p className="text-muted-foreground text-sm mb-6">{verifyError}</p>
              <p className="text-muted-foreground text-xs mb-4">
                Contact your employer to resend the invite, or sign in if you've already set up your account.
              </p>
              <Link to="/login">
                <Button className="bg-primary hover:bg-primary/90" data-testid="invite-error-login-link">
                  Go to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-success-page">
        <div className="w-full max-w-md text-center">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Account Set Up</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Your account is ready. You can now sign in with your email and the password you just created.
              </p>
              <Button
                onClick={() => navigate("/login")}
                className="bg-primary hover:bg-primary/90 w-full"
                data-testid="invite-success-login-button"
              >
                Sign In Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-setup-page">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <ChurvoxLogo size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-white font-heading">Set Up Your Account</h1>
          <p className="text-muted-foreground mt-2">
            <span className="text-primary font-medium">{inviteData?.business_name}</span> has invited you to join their team
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">Complete Setup</CardTitle>
            <CardDescription>
              Signing in as <span className="text-white font-medium">{inviteData?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="invite-setup-error">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    data-testid="invite-setup-name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    required
                    data-testid="invite-setup-password-input"
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
                    className="pl-10 bg-secondary border-border"
                    required
                    data-testid="invite-setup-confirm-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 font-medium"
                disabled={loading}
                data-testid="invite-setup-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already set up?{" "}
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
                data-testid="invite-login-link"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
