import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import LaunchAuditPage from "./pages/LaunchAuditPage";
import LaunchCheckPage from "./pages/LaunchCheckPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
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

const SAFE_HOME = "/jobs";
const TIMESHEETS_PATH = "/timesheets";

function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("owner_portal_session");
  localStorage.removeItem("platform_owner_email");
}

function Spinner() {
  const [showHelp, setShowHelp] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShowHelp(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-sm font-bold text-slate-700">Loading Churvox…</p>
        {showHelp ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => { clearAuthStorage(); window.location.href = "/login"; }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Return to login</button>
            <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700">Refresh</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useLoadingTimeout(loading) {
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return undefined;
    }
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [loading]);
  return timedOut;
}

function Guard({ children, type = "business" }) {
  const auth = useAuth();
  const timedOut = useLoadingTimeout(auth.loading);
  if (auth.loading && !timedOut) return <Spinner />;
  if (auth.loading && timedOut) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }
  if (!auth.user) return <Navigate to="/login" replace />;
  if (type === "worker") return auth.isWorker ? children : <Navigate to={SAFE_HOME} replace />;
  if (type === "payroll") {
    if (!["owner", "manager", "payroll"].includes(auth.normalizedRole)) return <Navigate to={SAFE_HOME} replace />;
    if (auth.normalizedRole !== "payroll" && (auth.mustChoosePlan || !auth.hasAppAccess)) return <Navigate to="/plans" replace />;
    return children;
  }
  if (auth.isWorker) return <Navigate to="/worker/jobs" replace />;
  if (auth.isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  if (auth.mustChoosePlan || !auth.hasAppAccess) return <Navigate to="/plans" replace />;
  if (type === "team" && !["owner", "manager"].includes(auth.normalizedRole)) return <Navigate to={SAFE_HOME} replace />;
  return children;
}

function PublicRoute({ children }) {
  const auth = useAuth();
  const timedOut = useLoadingTimeout(auth.loading);
  if (auth.loading && !timedOut) return <Spinner />;
  if (auth.loading && timedOut) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }
  if (!auth.user) return children;
  if (auth.mustChoosePlan) return <Navigate to="/plans" replace />;
  if (auth.isWorker) return <Navigate to="/worker/jobs" replace />;
  if (auth.isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  return <Navigate to={SAFE_HOME} replace />;
}

function RoleRedirect() {
  const auth = useAuth();
  const timedOut = useLoadingTimeout(auth.loading);
  if (auth.loading && !timedOut) return <Spinner />;
  if (auth.loading && timedOut) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }
  if (!auth.user) return <Navigate to="/login" replace />;
  if (auth.mustChoosePlan) return <Navigate to="/plans" replace />;
  if (auth.isWorker) return <Navigate to="/worker/jobs" replace />;
  if (auth.isPayroll) return <Navigate to={TIMESHEETS_PATH} replace />;
  return <Navigate to={SAFE_HOME} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
      <Route path="/invite/setup/:token" element={<InviteSetupPage />} />
      <Route path="/public/quote/:token" element={<PublicQuotePage />} />
      <Route path="/public/invoice/:token" element={<PublicInvoicePage />} />
      <Route path="/public/customer-portal/:token" element={<PublicCustomerPortalPage />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/dashboard" element={<Navigate to={SAFE_HOME} replace />} />
      <Route path="/overview" element={<Navigate to={SAFE_HOME} replace />} />
      <Route path="/owner" element={<Navigate to={SAFE_HOME} replace />} />
      <Route path="/owner/dashboard" element={<Navigate to={SAFE_HOME} replace />} />
      <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
      <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
      <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
      <Route path="/admin/launch-audit" element={<PlatformAdminRoute><LaunchAuditPage /></PlatformAdminRoute>} />
      <Route path="/launch-audit" element={<PlatformAdminRoute><LaunchAuditPage /></PlatformAdminRoute>} />
      <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
      <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
      <Route path="/smart-hub" element={<Guard><AIAssistantPage /></Guard>} />
      <Route path="/ai-assistant" element={<Navigate to="/smart-hub" replace />} />
      <Route path="/jobs" element={<Guard><JobsPage /></Guard>} />
      <Route path="/jobs/new" element={<Guard><JobFormPage /></Guard>} />
      <Route path="/jobs/:id" element={<Guard><JobDetailPage /></Guard>} />
      <Route path="/jobs/:id/edit" element={<Guard><JobFormPage /></Guard>} />
      <Route path="/schedule" element={<Guard><SchedulePage /></Guard>} />
      <Route path="/clients" element={<Guard><ClientsPage /></Guard>} />
      <Route path="/clients/new" element={<Guard><ClientFormPage /></Guard>} />
      <Route path="/clients/:id" element={<Guard><ClientDetailPage /></Guard>} />
      <Route path="/clients/:id/edit" element={<Guard><ClientFormPage /></Guard>} />
      <Route path="/quotes" element={<Guard><QuotesPage /></Guard>} />
      <Route path="/quotes/new" element={<Guard><QuoteFormPage /></Guard>} />
      <Route path="/quotes/:id" element={<Guard><QuoteDetailPage /></Guard>} />
      <Route path="/quotes/:id/edit" element={<Guard><QuoteFormPage /></Guard>} />
      <Route path="/invoices" element={<Guard><InvoicesPage /></Guard>} />
      <Route path="/invoices/new" element={<Guard><InvoiceFormPage /></Guard>} />
      <Route path="/invoices/:id" element={<Guard><InvoiceDetailPage /></Guard>} />
      <Route path="/follow-ups" element={<Guard><FollowUpsPage /></Guard>} />
      <Route path="/integrations" element={<Guard><IntegrationsPage /></Guard>} />
      <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
      <Route path="/plans" element={<Guard><PlansPage /></Guard>} />
      <Route path="/notifications" element={<Guard><NotificationsPage /></Guard>} />
      <Route path="/reports" element={<Guard><ComingSoonPage title="Reports coming soon" description="Reports will return when they provide strong business insight instead of basic or half-finished numbers." /></Guard>} />
      <Route path="/sms" element={<Guard><ComingSoonPage title="Communications coming soon" description="SMS and customer communications are being kept out of the core launch path until sending, credits and reminders are fully reliable." /></Guard>} />
      <Route path="/launch-check" element={<Guard><LaunchCheckPage /></Guard>} />
      <Route path="/team" element={<Guard type="team"><TeamPage /></Guard>} />
      <Route path="/automation" element={<Guard type="team"><AutomationPage /></Guard>} />
      <Route path="/automation/runs" element={<Guard type="team"><AutomationRunsPage /></Guard>} />
      <Route path={TIMESHEETS_PATH} element={<Guard type="payroll"><TimesheetsPage /></Guard>} />
      <Route path="/payroll" element={<Navigate to={TIMESHEETS_PATH} replace />} />
      <Route path="/worker/jobs" element={<Guard type="worker"><WorkerJobsPage /></Guard>} />
      <Route path="/worker/jobs/:id" element={<Guard type="worker"><WorkerJobDetailPage /></Guard>} />
      <Route path="/worker/settings" element={<Guard type="worker"><WorkerSettingsPage /></Guard>} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/account-deletion" element={<AccountDeletionPage />} />
      <Route path="/platform-unlock" element={<PlatformUnlock />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}

function App() {
  React.useEffect(() => {
    document.body.classList.add("churvox-theme");
    return () => document.body.classList.remove("churvox-theme");
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Toaster position="top-right" richColors />
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
