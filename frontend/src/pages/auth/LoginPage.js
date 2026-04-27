import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
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
    <div className="cx-auth-shell">
      <div className="cx-auth-panel">
        <div className="cx-auth-card animate-in">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center mb-5">
              <ChurvoxLogo size="lg" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-2">Sign in to run jobs, crew, dispatch and billing from one command centre.</p>
          </div>

          <Card className="bg-card border-border shadow-none border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-heading">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="login-error">
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
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                      data-testid="forgot-password-link"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 font-medium"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link 
                  to="/signup" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                  data-testid="signup-link"
                >
                  Sign up
                </Link>
              </p>

              <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground/60">
                <Link to="/privacy" className="hover:text-muted-foreground transition-colors" data-testid="login-privacy-link">Privacy</Link>
                <Link to="/terms" className="hover:text-muted-foreground transition-colors" data-testid="login-terms-link">Terms</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="cx-auth-aside">
        <div className="max-w-lg text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <ChurvoxLogo size="xl" />
          </div>
          <h2 className="text-3xl font-semibold text-white mb-4">
            Premium operating system for service businesses
          </h2>
          <p className="text-blue-100/90 text-lg mb-6">
            Churvox unifies dispatch, jobs, payroll and customer comms so your team stays aligned from office to field.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-blue-50/90">
            <span className="px-3 py-1 rounded-full border border-blue-200/20 bg-blue-400/10">Dispatch board</span>
            <span className="px-3 py-1 rounded-full border border-blue-200/20 bg-blue-400/10">Crew tracking</span>
            <span className="px-3 py-1 rounded-full border border-blue-200/20 bg-blue-400/10">MYOB ready</span>
            <span className="px-3 py-1 rounded-full border border-amber-200/20 bg-amber-400/10">Invoice flow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
