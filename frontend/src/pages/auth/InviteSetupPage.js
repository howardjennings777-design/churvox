import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { AlertCircle, CheckCircle, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import API_BASE from "../../lib/apiBase";

axios.defaults.withCredentials = true;

function isWorkerInvite(invite = {}) {
  const role = String(invite?.role || invite?.invite_role || invite?.worker_role || invite?.account_type || "").trim().toLowerCase();
  return /worker|staff|field_worker|technician|subcontractor/.test(role) || invite?.is_worker === true || Boolean(invite?.worker_id);
}

function loginPathFor(invite = {}) {
  const params = new URLSearchParams();
  if (isWorkerInvite(invite)) params.set("worker", "1");
  const email = String(invite?.email || "").trim().toLowerCase();
  if (email) params.set("email", email);
  const query = params.toString();
  return `/login${query ? `?${query}` : ""}`;
}

function inviteErrorMessage(error) {
  const status = error?.response?.status;
  const detail = String(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "").trim();
  if (status === 400 && /invalid|expired/i.test(detail)) return "This invite is invalid, expired, or has already been used. Ask the business owner to resend it.";
  if (status === 409 || /already.*accepted|already.*set up/i.test(detail)) return "This account is already set up. Sign in with the invited email.";
  if (status === 429) return "Too many invite attempts. Wait a few minutes and try again.";
  return detail || "The invite could not be completed. Ask the business owner to resend it.";
}

export default function InviteSetupPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function verifyToken() {
      if (!token) {
        setVerifyError("This invite link is missing its token. Ask the business owner to send a new invite.");
        setVerifying(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE}/api/invite/verify/${encodeURIComponent(token)}`, {
          timeout: 12000,
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!alive) return;
        const invite = response.data?.invite || response.data?.data || response.data || {};
        if (response.data?.success === false || response.data?.valid === false) throw new Error(response.data?.detail || response.data?.message || "Invalid invite link");
        if (!isWorkerInvite(invite)) throw new Error("This invite is not a valid worker invite.");
        setInviteData(invite);
        setName(invite.name || invite.full_name || "");
      } catch (requestError) {
        if (!alive || requestError?.name === "CanceledError") return;
        setVerifyError(inviteErrorMessage(requestError));
      } finally {
        if (alive) setVerifying(false);
      }
    }

    verifyToken();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [token]);

  const loginPath = loginPathFor(inviteData);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!name.trim()) return setError("Enter your name.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password.length > 128) return setError("Password must be no more than 128 characters.");

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/invite/accept`, {
        token,
        password,
        name: name.trim(),
      }, {
        timeout: 18000,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      if (response.data?.success === false) throw new Error(response.data?.detail || response.data?.message || "Account setup failed");
      setSuccess(true);
    } catch (requestError) {
      setError(inviteErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center" data-testid="invite-loading" data-version="CHURVOX_INVITE_SETUP_SECURE_20260712">
        <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" /><p className="text-muted-foreground" role="status">Verifying your invite…</p></div>
      </main>
    );
  }

  if (verifyError) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-error-page" data-version="CHURVOX_INVITE_SETUP_SECURE_20260712">
        <div className="w-full max-w-md text-center">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-slate-900 mb-2">Invite link unavailable</h1>
              <p className="text-muted-foreground text-sm mb-6" role="alert">{verifyError}</p>
              <p className="text-muted-foreground text-xs mb-4">Ask the business owner to resend the invite, or sign in if the account was already set up.</p>
              <div className="grid gap-3">
                <Link to="/login?worker=1"><Button className="w-full bg-primary hover:bg-primary/90" data-testid="invite-error-login-link">Open worker sign in</Button></Link>
                <Link to="/support" className="text-sm font-semibold text-primary">Contact Churvox support</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-success-page" data-version="CHURVOX_INVITE_SETUP_SECURE_20260712">
        <div className="w-full max-w-md text-center">
          <ChurvoxLogo size="lg" className="mx-auto mb-6" />
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-slate-900 mb-2">Worker account ready</h1>
              <p className="text-muted-foreground text-sm mb-6" role="status">Sign in with {inviteData?.email || "the invited email"} and the password you just created.</p>
              <Button onClick={() => navigate(loginPath, { replace: true })} className="bg-primary hover:bg-primary/90 w-full" data-testid="invite-success-login-button">Open worker sign in</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="invite-setup-page" data-version="CHURVOX_INVITE_SETUP_SECURE_20260712">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6"><ChurvoxLogo size="lg" /></div>
          <h1 className="text-2xl font-semibold text-slate-900">Set up your worker account</h1>
          <p className="text-muted-foreground mt-2"><span className="text-primary font-medium">{inviteData?.business_name || "The business"}</span> invited you to join their team.</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-heading">Complete setup</CardTitle>
            <CardDescription>Signing in as <span className="text-slate-900">{inviteData?.email}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error ? <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="invite-setup-error" role="alert" aria-live="assertive"><AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span></div> : null}

              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" type="text" placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} className="pl-10 bg-secondary border-border" autoComplete="name" required disabled={loading} data-testid="invite-setup-name-input" /></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create password</Label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" placeholder="8 to 128 characters" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 bg-secondary border-border" autoComplete="new-password" minLength={8} maxLength={128} required disabled={loading} data-testid="invite-setup-password-input" /></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="confirmPassword" type="password" placeholder="Repeat the password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="pl-10 bg-secondary border-border" autoComplete="new-password" minLength={8} maxLength={128} required disabled={loading} data-testid="invite-setup-confirm-password-input" /></div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-medium" disabled={loading} data-testid="invite-setup-submit-button">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up…</> : "Complete setup"}</Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">Already set up? <Link to={loginPath} className="text-primary hover:text-primary/80 font-medium transition-colors" data-testid="invite-login-link">Sign in</Link></p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
