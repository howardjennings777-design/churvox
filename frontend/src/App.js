import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { getDefaultRoute } from "./lib/roles";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import InviteSetupPage from "./pages/auth/InviteSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/jobs/JobsPage";
import JobFormPage from "./pages/jobs/JobFormPage";
import JobDetailPage from "./pages/jobs/JobDetailPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ClientFormPage from "./pages/clients/ClientFormPage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";
import QuotesPage from "./pages/quotes/QuotesPage";
import QuoteFormPage from "./pages/quotes/QuoteFormPage";
import QuoteDetailPage from "./pages/quotes/QuoteDetailPage";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import InvoiceFormPage from "./pages/invoices/InvoiceFormPage";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import SettingsPage from "./pages/SettingsPage";
import PlansPage from "./pages/PlansPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import SMSPage from "./pages/SMSPage";
import PayrollPage from "./pages/PayrollPage";
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
import AutomationPage from "./pages/AutomationPage";
import AutomationRunsPage from "./pages/AutomationRunsPage";
import ReportsPage from "./pages/ReportsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import PublicQuotePage from "./pages/public/PublicQuotePage";
import PublicInvoicePage from "./pages/public/PublicInvoicePage";
import PublicClientPortalPage from "./pages/public/PublicClientPortalPage";
import ProofToPaidPage from "./pages/ProofToPaidPage";
import QAAuditorPage from "./pages/admin/QAAuditorPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

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

// Business routes: owner, manager, office_admin — with plan check
function BusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!hasAppAccess) return <Navigate to="/plans" replace />;
  return children;
}

// Owner-only routes (plans, billing)
function OwnerRoute({ children }) {
  const { user, loading, isOwnerUser, isWorker, isPayroll, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!isOwnerUser) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return children;
}

// Team routes: owner + manager only
function TeamRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!hasAppAccess) return <Navigate to="/plans" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager") return <Navigate to="/dashboard" replace />;
  return children;
}

// Worker-only routes
function WorkerRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isWorker) return <Navigate to="/dashboard" replace />;
  return children;
}

// Payroll-allowed routes
function PayrollRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager" && normalizedRole !== "payroll") {
    return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  }
  return children;
}


function ReportsRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!["owner", "manager", "office_admin"].includes(normalizedRole)) {
    return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  }
  return children;
}

// Catch-all redirect based on role

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

function App() {
  React.useEffect(() => {
    // Global post-Stripe-checkout handler — runs once on mount.
    // Works regardless of which page Stripe returned the user to.
    const handleCheckoutReturn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get("checkout");
        const sessionId = params.get("session_id") || "";
        const plan = (params.get("plan") || "").toLowerCase();
        if (!checkout && !sessionId) return;

        const token = localStorage.getItem("token");
        const backendUrl = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

        // 1) Idempotent confirm — the backend already saved the plan on its
        //    /api/stripe/checkout-success handler, but calling this again is safe
        //    and guarantees the frontend sees the latest plan even if the user
        //    refreshed mid-flight or landed via direct link.
        if (sessionId && token && backendUrl) {
          try {
            await fetch(`${backendUrl}/api/billing/confirm-checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              credentials: "include",
              body: JSON.stringify({ session_id: sessionId }),
            });
          } catch (err) {
            console.warn("confirm-checkout failed (non-fatal):", err);
          }
        }

        // 2) User feedback
        if (checkout === "success") {
          toast.success(
            plan
              ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is now active`
              : "Plan updated"
          );
        } else if (checkout === "cancelled") {
          toast.info("Checkout cancelled — no changes to your plan");
        }

        // 3) Refresh auth so the UI shows the new plan immediately
        window.dispatchEvent(new Event("churvox-auth-refresh"));

        // 4) Clean query params from the URL without leaving the current page
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
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/invite/setup/:token" element={<InviteSetupPage />} />
          <Route path="/public/quote/:token" element={<PublicQuotePage />} />
          <Route path="/public/invoice/:token" element={<PublicInvoicePage />} />
          <Route path="/client-portal/:token" element={<PublicClientPortalPage />} />

          {/* Legacy redirects */}
          <Route path="/owner-login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/owner" element={<Navigate to="/admin" replace />} />
          <Route path="/owner/login" element={<Navigate to="/login" replace />} />
          <Route path="/proof-to-paid" element={<BusinessRoute><ProofToPaidPage /></BusinessRoute>} />
          <Route path="/ai-operator" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><DashboardPage /></ErrorBoundary></BusinessRoute>} />

          {/* Platform admin */}
          <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
          <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
          <Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />

          {/* Business routes (owner, manager, office_admin) */}
          <Route path="/dashboard" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><DashboardPage /></ErrorBoundary></BusinessRoute>} />
          <Route path="/overview" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><DashboardPage /></ErrorBoundary></BusinessRoute>} />
          <Route path="/onboarding" element={<BusinessRoute><OnboardingPage /></BusinessRoute>} />
          <Route path="/jobs" element={<BusinessRoute><JobsPage /></BusinessRoute>} />
          <Route path="/jobs/new" element={<BusinessRoute><JobFormPage /></BusinessRoute>} />
          <Route path="/jobs/:id" element={<BusinessRoute><JobDetailPage /></BusinessRoute>} />
          <Route path="/jobs/:id/edit" element={<BusinessRoute><JobFormPage /></BusinessRoute>} />
          <Route path="/dispatch" element={<BusinessRoute><CalendarPage /></BusinessRoute>} />
          <Route path="/calendar" element={<Navigate to="/dispatch" replace />} />
          <Route path="/clients" element={<BusinessRoute><ClientsPage /></BusinessRoute>} />
          <Route path="/clients/new" element={<BusinessRoute><ClientFormPage /></BusinessRoute>} />
          <Route path="/clients/:id" element={<BusinessRoute><ClientDetailPage /></BusinessRoute>} />
          <Route path="/clients/:id/edit" element={<BusinessRoute><ClientFormPage /></BusinessRoute>} />
          <Route path="/quotes" element={<BusinessRoute><QuotesPage /></BusinessRoute>} />
          <Route path="/quotes/new" element={<BusinessRoute><QuoteFormPage /></BusinessRoute>} />
          <Route path="/quotes/:id" element={<BusinessRoute><QuoteDetailPage /></BusinessRoute>} />
          <Route path="/quotes/:id/edit" element={<BusinessRoute><QuoteFormPage /></BusinessRoute>} />
          <Route path="/invoices" element={<BusinessRoute><InvoicesPage /></BusinessRoute>} />
          <Route path="/invoices/new" element={<BusinessRoute><InvoiceFormPage /></BusinessRoute>} />
          <Route path="/invoices/:id" element={<BusinessRoute><InvoiceDetailPage /></BusinessRoute>} />
          <Route path="/sms" element={<BusinessRoute><SMSPage /></BusinessRoute>} />
          <Route path="/reports" element={<ReportsRoute><ReportsPage /></ReportsRoute>} />
          <Route path="/integrations" element={<BusinessRoute><IntegrationsPage /></BusinessRoute>} />
          <Route path="/settings" element={<BusinessRoute><SettingsPage /></BusinessRoute>} />

          {/* Owner-only */}
          <Route path="/plans" element={<OwnerRoute><PlansPage /></OwnerRoute>} />

          {/* Team: owner + manager */}
          <Route path="/team" element={<TeamRoute><TeamPage /></TeamRoute>} />

          {/* Notifications: any authenticated user */}
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />

          {/* Automation: owner + manager */}
          <Route path="/automation" element={<TeamRoute><AutomationPage /></TeamRoute>} />
          <Route path="/automation/runs" element={<TeamRoute><AutomationRunsPage /></TeamRoute>} />

          {/* Payroll */}
          <Route path="/payroll" element={<PayrollRoute><PayrollPage /></PayrollRoute>} />

          {/* Worker routes */}
          <Route path="/worker/jobs" element={<WorkerRoute><WorkerJobsPage /></WorkerRoute>} />
          <Route path="/worker/jobs/:id" element={<WorkerRoute><WorkerJobDetailPage /></WorkerRoute>} />
          <Route path="/worker/settings" element={<WorkerRoute><WorkerSettingsPage /></WorkerRoute>} />

          {/* Legal (public) */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />
          <Route path="/platform-unlock" element={<PlatformUnlock />} />

          {/* Catch-all */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
