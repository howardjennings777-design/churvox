import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { getDefaultRoute } from "./lib/roles";

import LoginPage from "./v3/pages/V3LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import InviteSetupPage from "./pages/auth/InviteSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import WorkerJobsPage from "./pages/worker/WorkerJobsPage";
import WorkerJobDetailPage from "./pages/worker/WorkerJobDetailPage";
import OnboardingPage from "./pages/OnboardingPage";
import WorkerSettingsPage from "./pages/worker/WorkerSettingsPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import AccountDeletionPage from "./pages/legal/AccountDeletionPage";
import AdminUsagePage from "./pages/AdminUsagePage";
import PlatformAdminRoute from "./components/admin/PlatformAdminRoute";
import PlatformUnlock from "./pages/admin/PlatformUnlock";
import NotificationsPage from "./pages/NotificationsPage";
import PublicQuotePage from "./pages/public/PublicQuotePage";
import PublicInvoicePage from "./pages/public/PublicInvoicePage";
import PublicClientPortalPage from "./pages/public/PublicClientPortalPage";
import QAAuditorPage from "./pages/admin/QAAuditorPage";
import SmartHubHardReset from "./pages/SmartHubHardReset";
import V3WorkspacePage from "./v3/pages/V3WorkspacePage";
import V3OperatorPage from "./v3/pages/V3OperatorPage";
import V3BillingPage from "./v3/pages/V3BillingPage";
import V3SectionRoute from "./v3/components/V3SectionRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import V9BusinessEngine from "./v9/V9BusinessEngine";
import V8CommandBrain from "./v8/V8CommandBrain";
import V7CommandBrain from "./v7/V7CommandBrain";
import V7BusinessBrainCockpit from "./v7/V7BusinessBrainCockpit";
import V6BusinessBrain from "./v6/V6BusinessBrain";

import V4WorkerPage from "./v4/pages/V4WorkerPage";
import V5CommandApp from "./v5/V5CommandApp";

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
  </div>
);

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return children;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  if (isPlatformOwner) return <Navigate to="/admin" replace />;
  return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
}

function BusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!hasAppAccess) return <Navigate to="/plans" replace />;
  return children;
}


function BillingRoute({ children }) {
  const { user, loading, isWorker, isPayroll } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  return children;
}

function WorkerRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isWorker) return <Navigate to="/dashboard" replace />;
  return children;
}

function QaAuditorRoute({ children }) {
  const { user, loading, normalizedRole, isPayroll, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  const allowed = isPlatformOwner || normalizedRole === "owner";
  if (!allowed || isWorker || isPayroll) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true;
  if (isPlatformOwner) return <Navigate to="/admin" replace />;
  return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
}

const SmartHubRoute = () => (
  <BusinessRoute>
    <ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login">
      <V7BusinessBrainCockpit />
    </ErrorBoundary>
  </BusinessRoute>
);

function App() {
  React.useEffect(() => {
    const handleCheckoutReturn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (window.location.pathname.startsWith("/v3/plans") && params.get("billing_success")) {
          return;
        }
        const checkout = params.get("checkout");
        const sessionId = params.get("session_id") || "";
        const plan = (params.get("plan") || "").toLowerCase();
        if (!checkout && !sessionId) return;
        const token = localStorage.getItem("token");
        const backendUrl = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
        if (sessionId && token && backendUrl) {
          try {
            await fetch(`${backendUrl}/api/billing/confirm-checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              credentials: "include",
              body: JSON.stringify({ session_id: sessionId }),
            });
          } catch (err) { console.warn("confirm-checkout failed (non-fatal):", err); }
        }
        if (checkout === "success") {
          toast.success(plan ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is now active` : "Plan updated");
        } else if (checkout === "cancelled") {
          toast.info("Checkout cancelled — no changes to your plan");
        }
        window.dispatchEvent(new Event("churvox-auth-refresh"));
        const cleaned = new URL(window.location.href);
        ["checkout", "session_id", "plan"].forEach((k) => cleaned.searchParams.delete(k));
        window.history.replaceState({}, document.title, cleaned.toString());
      } catch (err) { console.error("Checkout return handler failed:", err); }
    };
    handleCheckoutReturn();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* V9 owner command engine */}
          <Route path="/dashboard" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/work" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/money" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/clients" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/team" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/ai" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/automation" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/reports" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />
          <Route path="/settings" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />

          <Route path="/jobs" element={<Navigate to="/work" replace />} />
          <Route path="/jobs/new" element={<Navigate to="/work" replace />} />
          <Route path="/jobs/:id" element={<Navigate to="/work" replace />} />
          <Route path="/jobs/:id/edit" element={<Navigate to="/work" replace />} />
          <Route path="/dispatch" element={<Navigate to="/work" replace />} />
          <Route path="/calendar" element={<Navigate to="/work" replace />} />

          <Route path="/quotes" element={<Navigate to="/money" replace />} />
          <Route path="/quotes/new" element={<Navigate to="/money" replace />} />
          <Route path="/quotes/:id" element={<Navigate to="/money" replace />} />
          <Route path="/quotes/:id/edit" element={<Navigate to="/money" replace />} />

          <Route path="/invoices" element={<Navigate to="/money" replace />} />
          <Route path="/invoices/new" element={<Navigate to="/money" replace />} />
          <Route path="/invoices/:id" element={<Navigate to="/money" replace />} />

          <Route path="/sms" element={<Navigate to="/money" replace />} />
          <Route path="/payroll" element={<Navigate to="/team" replace />} />
          <Route path="/integrations" element={<Navigate to="/settings" replace />} />
          <Route path="/contact" element={<Navigate to="/settings" replace />} />

          <Route path="/v3/operator" element={<Navigate to="/ai" replace />} />
          <Route path="/v3/:section" element={<BusinessRoute><V9BusinessEngine /></BusinessRoute>} />

          {/* V8 owner command workspace - all owner areas stay in one popup-first AI brain */}

          <Route path="/v3/plans" element={<BillingRoute><V3BillingPage /></BillingRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/invite/setup/:token" element={<InviteSetupPage />} />
          <Route path="/public/quote/:token" element={<PublicQuotePage />} />
          <Route path="/public/invoice/:token" element={<PublicInvoicePage />} />
          <Route path="/client-portal/:token" element={<PublicClientPortalPage />} />
          <Route path="/owner-login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/owner" element={<Navigate to="/admin" replace />} />
          <Route path="/owner/login" element={<Navigate to="/login" replace />} />
          <Route path="/proof-to-paid" element={<Navigate to="/v3/proof" replace />} />
          <Route path="/ai-control-room" element={<Navigate to="/dashboard" replace />} />
          <Route path="/ai-operator" element={<SmartHubRoute />} />
          <Route path="/ai-operator/approvals" element={<Navigate to="/v3/decisions" replace />} />
          <Route path="/ai-approvals" element={<Navigate to="/v3/decisions" replace />} />
          <Route path="/ai-operator/settings" element={<Navigate to="/v3/rules" replace />} />
          <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
          <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
          <Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
          <Route path="/overview" element={<SmartHubRoute />} />
          <Route path="/onboarding" element={<BusinessRoute><OnboardingPage /></BusinessRoute>} />
          <Route path="/clients/new" element={<Navigate to="/v3/clients" replace />} />
          <Route path="/clients/:id" element={<Navigate to="/v3/clients" replace />} />
          <Route path="/clients/:id/edit" element={<Navigate to="/v3/clients" replace />} />
          <Route path="/plans" element={<Navigate to="/v3/plans" replace />} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/automation/runs" element={<Navigate to="/v3/rules" replace />} />
          <Route path="/worker" element={<WorkerRoute><Navigate to="/worker/jobs" replace /></WorkerRoute>} />
          <Route path="/worker/dashboard" element={<WorkerRoute><Navigate to="/worker/jobs" replace /></WorkerRoute>} />
          <Route path="/worker/jobs" element={<WorkerRoute><V4WorkerPage /></WorkerRoute>} />
          <Route path="/worker/jobs/:id" element={<WorkerRoute><WorkerJobDetailPage /></WorkerRoute>} />
          <Route path="/worker/settings" element={<WorkerRoute><WorkerSettingsPage /></WorkerRoute>} />
          <Route path="/worker/profile" element={<WorkerRoute><Navigate to="/worker/settings" replace /></WorkerRoute>} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />
          <Route path="/platform-unlock" element={<PlatformUnlock />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
