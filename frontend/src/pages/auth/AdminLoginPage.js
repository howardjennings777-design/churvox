import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

export default function AdminLoginPage() {
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
        navigate("/admin");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="admin-login-page">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <ChurvoxLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <ShieldCheck size={14} />
            Admin Access
          </div>
          <h1 className="text-2xl font-semibold text-white font-heading">Admin Sign In</h1>
          <p className="text-muted-foreground mt-2">Platform administration access</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">Sign in</CardTitle>
            <CardDescription>Enter your admin credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="admin-login-error">
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
                    placeholder="admin@churvox.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    required
                    data-testid="admin-login-email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                    data-testid="admin-login-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 font-medium"
                disabled={loading}
                data-testid="admin-login-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in as Admin"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
                data-testid="back-to-login-link"
              >
                Back to regular sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
