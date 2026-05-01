import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import LaunchAuditPage from "./pages/LaunchAuditPage";
import LaunchCheckPage from "./pages/LaunchCheckPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { getDefaultRoute } from "./lib/roles";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import InviteSetupPage from "./pages/auth/InviteSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AIAssistantPage from "./pages/SafeAIAssistantPage";
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
import TeamPage from "./pages/TeamPage";
import TimesheetsPage from "./pages/TimesheetsPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import SchedulePage from "./pages/SchedulePage";
import WorkerJobsPage from "./pages/worker/WorkerJobsPage";
import WorkerJobDetailPage from "./pages/worker/WorkerJobDetailPage";
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
import IntegrationsPage from "./pages/IntegrationsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import PublicQuotePage from "./pages/public/PublicQuotePage";
import PublicInvoicePage from "./pages/public/PublicInvoicePage";
import PublicCustomerPortalPage from "./pages/public/PublicCustomerPortalPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const TIMESHEETS_PATH = "/timesheets";
const SMART_HUB_PATH = "/smart-hub";
const isPlatformOwnerEmail = (user) => String(user?.email || "").trim().toLowerCase() === PLATFORM_OWNER_EMAIL;

const Spinner = () => {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen chx-worker-shell flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
        {showFallback ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">Still loading? Refresh or return to login.</p>
            <a href="/login" className="mt-2 inline-block text-sm font-bold text-blue-700 hover:underline">Go to login</a>
          </div>
        ) : null}
      </div>
    </div>
  );
};

function roleDefaultRoute(role) {
  return role === "payroll" ? TIMESHEETS_PATH : getDefaultRoute(role);
}

function PublicRoute({ children }) {
  const { user, loading, normalizedRole, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return children;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (mustChoosePlan) return <Navigate to="/plans" replace />;
  return <Navigate to={roleDefaultRoute(normalizedRole)} replace />;
}

function BusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  if (mustChoosePlan || !hasAppAccess) return <Navigate to="/plans" replace />;
  return children;
}

function OwnerRoute({ children }) {
  const { user, loading, isOwnerUser, isWorker, isPayroll, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  if (!isOwnerUser) return <Navigate to={roleDefaultRoute(normalizedRole)} replace />;
  return children;
}

function TeamRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess, mustChoosePlan, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  if (mustChoosePlan || !hasAppAccess) return <Navigate to="/plans" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager") return <Navigate to={SMART_HUB_PATH} replace />;
  return children;
}

function AIRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess, mustChoosePlan, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  if (mustChoosePlan || !hasAppAccess) return <Navigate to="/plans" replace />;
  if (!["owner", "employer", "manager", "office_admin"].includes(normalizedRole)) return <Navigate to={SMART_HUB_PATH} replace />;
  return children;
}

function NotificationsRoute({ children }) {
  const { user, loading, isWorker, hasAppAccess, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (!isWorker && (mustChoosePlan || !hasAppAccess)) return <Navigate to="/plans" replace />;
  return children;
}

function WorkerRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (!isWorker) return <Navigate to={SMART_HUB_PATH} replace />;
  return children;
}

function TimesheetsRoute({ children }) {
  const { user, loading, normalizedRole, hasAppAccess, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager" && normalizedRole !== "payroll") {
    return <Navigate to={roleDefaultRoute(normalizedRole)} replace />;
  }
  if (normalizedRole !== "payroll" && (mustChoosePlan || !hasAppAccess)) return <Navigate to="/plans" replace />;
  return children;
}

function ReportsRoute({ children }) {
  const { user, loading, normalizedRole, hasAppAccess, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (!["owner", "manager", "office_admin"].includes(normalizedRole)) {
    return <Navigate to={roleDefaultRoute(normalizedRole)} replace />;
  }
  if (mustChoosePlan || !hasAppAccess) return <Navigate to="/plans" replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading, normalizedRole, mustChoosePlan } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformOwnerEmail(user)) return <Navigate to="/admin" replace />;
  if (mustChoosePlan) return <Navigate to="/plans" replace />;
  return <Navigate to={roleDefaultRoute(normalizedRole)} replace />;
}

function App() {
  React.useEffect(() => {
    document.body.classList.add("churvox-theme");
    return () => document.body.classList.remove("churvox-theme");
  }, []);

  React.useEffect(() => {
    const handleCheckoutReturn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get("checkout");
        const sessionId = params.get("session_id") || "";
        const plan = (params.get("plan") || "").toLowerCase();
        const addon = (params.get("addon") || "").toLowerCase();
        if (!checkout && !sessionId) return;

        const token = localStorage.getItem("token");
        const backendUrl = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

        if (sessionId && token && backendUrl) {
          try {
            const confirmPath = addon === "extra_user_block" ? "/api/billing/confirm-extra-user-block" : "/api/billing/confirm-checkout";
            await fetch(`${backendUrl}${confirmPath}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              credentials: "include",
              body: JSON.stringify({ session_id: sessionId }),
            });
          } catch (err) {
            console.warn("checkout confirmation failed (non-fatal):", err);
          }
        }

        if (checkout === "success") {
          toast.success(addon === "extra_user_block" ? "Extra 50-user block added" : plan ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is now active` : "Plan updated");
        } else if (checkout === "cancelled") {
          toast.info("Checkout cancelled — no changes to your plan");
        }

        window.dispatchEvent(new Event("churvox-auth-refresh"));

        const cleaned = new URL(window.location.href);
        ["checkout", "session_id", "plan", "addon"].forEach((k) => cleaned.searchParams.delete(k));
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
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/invite/setup/:token" element={<InviteSetupPage />} />
          <Route path="/public/quote/:token" element={<PublicQuotePage />} />
          <Route path="/public/invoice/:token" element={<PublicInvoicePage />} />
          <Route path="/public/customer-portal/:token" element={<PublicCustomerPortalPage />} />

          <Route path="/owner-login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/owner" element={<Navigate to={SMART_HUB_PATH} replace />} />
          <Route path="/owner/login" element={<Navigate to="/login" replace />} />
          <Route path="/dispatch" element={<Navigate to="/schedule" replace />} />
          <Route path="/calendar" element={<Navigate to="/schedule" replace />} />
          <Route path="/payroll" element={<Navigate to={TIMESHEETS_PATH} replace />} />

          <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/owner/dashboard" element={<Navigate to={SMART_HUB_PATH} replace />} />
          <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
          <Route path="/admin/launch-audit" element={<PlatformAdminRoute><LaunchAuditPage /></PlatformAdminRoute>} />
          <Route path="/launch-audit" element={<PlatformAdminRoute><LaunchAuditPage /></PlatformAdminRoute>} />
          <Route path="/launch-check" element={<OwnerRoute><LaunchCheckPage /></OwnerRoute>} />
          <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
          <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />

          <Route path="/smart-hub" element={<AIRoute><AIAssistantPage /></AIRoute>} />
          <Route path="/dashboard" element={<Navigate to={SMART_HUB_PATH} replace />} />
          <Route path="/ai-assistant" element={<Navigate to={SMART_HUB_PATH} replace />} />
          <Route path="/overview" element={<Navigate to={SMART_HUB_PATH} replace />} />
          <Route path="/jobs" element={<BusinessRoute><JobsPage /></BusinessRoute>} />
          <Route path="/schedule" element={<BusinessRoute><SchedulePage /></BusinessRoute>} />
          <Route path="/jobs/new" element={<BusinessRoute><JobFormPage /></BusinessRoute>} />
          <Route path="/jobs/:id" element={<BusinessRoute><JobDetailPage /></BusinessRoute>} />
          <Route path="/jobs/:id/edit" element={<BusinessRoute><JobFormPage /></BusinessRoute>} />
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
          <Route path="/sms" element={<BusinessRoute><ComingSoonPage title="Communications coming soon" description="SMS and customer communications are being kept out of the core launch path until sending, credits and reminders are fully reliable." /></BusinessRoute>} />
          <Route path="/follow-ups" element={<BusinessRoute><FollowUpsPage /></BusinessRoute>} />
          <Route path="/reports" element={<ReportsRoute><ComingSoonPage title="Reports coming soon" description="Reports will return when they provide strong business insight instead of basic or half-finished numbers." /></ReportsRoute>} />
          <Route path="/integrations" element={<BusinessRoute><IntegrationsPage /></BusinessRoute>} />
          <Route path="/settings" element={<BusinessRoute><SettingsPage /></BusinessRoute>} />

          <Route path="/plans" element={<OwnerRoute><PlansPage /></OwnerRoute>} />
          <Route path="/team" element={<TeamRoute><TeamPage /></TeamRoute>} />
          <Route path="/notifications" element={<NotificationsRoute><NotificationsPage /></NotificationsRoute>} />
          <Route path="/automation" element={<TeamRoute><AutomationPage /></TeamRoute>} />
          <Route path="/automation/runs" element={<TeamRoute><AutomationRunsPage /></TeamRoute>} />
          <Route path={TIMESHEETS_PATH} element={<TimesheetsRoute><TimesheetsPage /></TimesheetsRoute>} />

          <Route path="/worker/jobs" element={<WorkerRoute><WorkerJobsPage /></WorkerRoute>} />
          <Route path="/worker/jobs/:id" element={<WorkerRoute><WorkerJobDetailPage /></WorkerRoute>} />
          <Route path="/worker/settings" element={<WorkerRoute><WorkerSettingsPage /></WorkerRoute>} />

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
