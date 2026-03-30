import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Building2, AlertCircle, Loader2, CheckCircle } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_phase1-launch/artifacts/j84zpsqt_1000049586.png";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    business_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      business_name: formData.business_name || null,
    });

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-card to-secondary items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 mb-8 ring-1 ring-primary/20">
            <img src={LOGO_URL} alt="Churvox" className="h-14" />
          </div>
          <h2 className="text-3xl font-semibold text-white font-heading mb-6">
            Start managing your business today
          </h2>
          <div className="space-y-4">
            {[
              "Schedule and track all your jobs",
              "Manage clients across any trade",
              "Create professional quotes",
              "Send invoices with GST",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-6 lg:hidden">
              <img 
                src={LOGO_URL} 
                alt="Churvox" 
                className="h-14 w-auto"
                data-testid="churvox-logo"
              />
              <span className="text-3xl font-semibold text-white tracking-tight font-heading">Churvox</span>
            </div>
            <h1 className="text-2xl font-semibold text-white font-heading">Create account</h1>
            <p className="text-muted-foreground mt-2">Get started with Churvox for free</p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-heading">Sign up</CardTitle>
              <CardDescription>Fill in your details to create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="signup-error">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="signup-name-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="signup-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Optional)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business_name"
                      name="business_name"
                      type="text"
                      placeholder="Your Business Ltd"
                      value={formData.business_name}
                      onChange={handleChange}
                      className="pl-10 bg-secondary border-border"
                      data-testid="signup-business-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="signup-password-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 bg-secondary border-border"
                      required
                      data-testid="signup-confirm-password-input"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 font-medium"
                  disabled={loading}
                  data-testid="signup-submit-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                  data-testid="login-link"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
