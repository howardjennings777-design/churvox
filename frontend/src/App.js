import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { getDefaultRoute } from "./lib/roles";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import InviteSetupPage from "./pages/auth/InviteSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import JobFormPage from "./pages/jobs/JobFormPage";
import JobDetailPage from "./pages/jobs/JobDetailPage";
import ClientFormPage from "./pages/clients/ClientFormPage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";
import QuoteFormPage from "./pages/quotes/QuoteFormPage";
import QuoteDetailPage from "./pages/quotes/QuoteDetailPage";
import InvoiceFormPage from "./pages/invoices/InvoiceFormPage";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import ContactPage from "./pages/ContactPage";
import PlansPage from "./pages/PlansPage";
import PipelinePage from "./pages/PipelinePage";
import MoneyDeskPage from "./pages/MoneyDeskPage";
import CustomerRecordsPage from "./pages/CustomerRecordsPage";
import CrewOperationsPage from "./pages/CrewOperationsPage";
import WorkerOperationsPage from "./pages/WorkerOperationsPage";
import BusinessSettingsPage from "./pages/BusinessSettingsPage";
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
import PublicQuotePage from "./pages/public/PublicQuotePage";
import PublicInvoicePage from "./pages/public/PublicInvoicePage";
import PublicClientPortalPage from "./pages/public/PublicClientPortalPage";
import PublicProofPackPage from "./pages/public/PublicProofPackPage";
import QAAuditorPage from "./pages/admin/QAAuditorPage";
import HomePage from "./pages/marketing/ExecutiveHomePage";
import PricingPage from "./pages/marketing/ExecutivePricingPage";
import FeaturesPage from "./pages/marketing/ExecutiveFeaturesPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FloatingBottomNav from "./components/FloatingBottomNav";
import ConceptCPage from "./concept-c/ConceptCPageExact";
import ConceptCFrame from "./concept-c/ConceptCFrame";
import TradePresetsPage from "./pages/TradePresetsPage";
import MessageApprovalQueuePage from "./pages/MessageApprovalQueuePage";
import DispatchBoardPage from "./pages/DispatchBoardPage";
import IntegrationsWorkspacePage from "./pages/IntegrationsWorkspacePage";
import AutomationWorkspacePage from "./pages/AutomationWorkspacePage";
import AIOperatorActionsPage from "./pages/AIOperatorActionsPage";
import ReportsSecurityPage from "./pages/ReportsSecurityPage";
import OfflineSyncPage from "./pages/OfflineSyncPage";
import TopTierOperatorToolsPage from "./pages/TopTierOperatorToolsPage";
import LaunchReadinessPage from "./pages/LaunchReadinessPage";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400" />
  </div>
);

const AppPage = ({ children }) => <>{children}</>;

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <AppPage>{children}</AppPage> : <Navigate to="/login" replace />;
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
  return <AppPage>{children}</AppPage>;
}

function OwnerRoute({ children }) {
  const { user, loading, isOwnerUser, isWorker, isPayroll, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!isOwnerUser) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
}

function TeamRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (isPayroll) return <Navigate to="/payroll" replace />;
  if (!hasAppAccess) return <Navigate to="/plans" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager") return <Navigate to="/dashboard" replace />;
  return <AppPage>{children}</AppPage>;
}

function WorkerRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isWorker) return <Navigate to="/dashboard" replace />;
  return <AppPage>{children}</AppPage>;
}

function PayrollRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (normalizedRole !== "owner" && normalizedRole !== "manager" && normalizedRole !== "payroll") return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
}

function ReportsRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!["owner", "manager", "office_admin"].includes(normalizedRole)) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
}

function QaAuditorRoute({ children }) {
  const { user, loading, normalizedRole, isPayroll, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  const allowed = isPlatformOwner || normalizedRole === "owner";
  if (!allowed || isWorker || isPayroll) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
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
    const handleCheckoutReturn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get("checkout");
        const sessionId = params.get("session_id") || "";
        const plan = (params.get("plan") || "").toLowerCase();
        if (!checkout && !sessionId) return;
        const token = localStorage.getItem("token");
        const backendUrl = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
        if (sessionId && token && backendUrl) {
          try {
            await fetch(`${backendUrl}/api/billing/confirm-checkout`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, credentials: "include", body: JSON.stringify({ session_id: sessionId }) });
          } catch (err) { console.warn("confirm-checkout failed (non-fatal):", err); }
        }
        if (checkout === "success") toast.success(plan ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is now active` : "Plan updated");
        else if (checkout === "cancelled") toast.info("Checkout cancelled — no changes to your plan");
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
          <FloatingBottomNav />
          <Routes>
            <Route path="/operator-tools" element={<BusinessRoute><TopTierOperatorToolsPage /></BusinessRoute>} />
            <Route path="/launch-control" element={<BusinessRoute><LaunchReadinessPage /></BusinessRoute>} />
            <Route path="/public/proof/:token" element={<PublicProofPackPage />} />
            <Route path="/offline-sync" element={<PrivateRoute><OfflineSyncPage /></PrivateRoute>} />
            <Route path="/dispatch-board" element={<BusinessRoute><DispatchBoardPage /></BusinessRoute>} />
            <Route path="/message-approvals" element={<BusinessRoute><MessageApprovalQueuePage /></BusinessRoute>} />
            <Route path="/trade-presets" element={<BusinessRoute><TradePresetsPage /></BusinessRoute>} />
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
            <Route path="/proof-to-paid" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/ai-operator" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/ai-operator/approvals" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/ai-operator/settings" element={<BusinessRoute><Navigate to="/settings" replace /></BusinessRoute>} />
            <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
            <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
            <Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
            <Route path="/dashboard" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><ConceptCPage area="dashboard" /></ErrorBoundary></BusinessRoute>} />
            <Route path="/overview" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><ConceptCPage area="dashboard" /></ErrorBoundary></BusinessRoute>} />
            <Route path="/onboarding" element={<BusinessRoute><OnboardingPage /></BusinessRoute>} />
            <Route path="/jobs" element={<BusinessRoute><ConceptCPage area="jobs" /></BusinessRoute>} />
            <Route path="/jobs/new" element={<BusinessRoute><ConceptCFrame area="jobs"><JobFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/jobs/:id" element={<BusinessRoute><ConceptCFrame area="jobs"><JobDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/jobs/:id/edit" element={<BusinessRoute><ConceptCFrame area="jobs"><JobFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/dispatch" element={<BusinessRoute><ConceptCFrame area="dispatch"><DispatchBoardPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/integrations" element={<BusinessRoute><ConceptCFrame area="integrations"><IntegrationsWorkspacePage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/automation" element={<BusinessRoute><ConceptCFrame area="automation"><AutomationWorkspacePage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/pipeline" element={<BusinessRoute><ConceptCFrame area="dashboard"><PipelinePage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/calendar" element={<Navigate to="/dispatch" replace />} />
            <Route path="/clients" element={<BusinessRoute><ConceptCFrame area="clients"><CustomerRecordsPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/new" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/:id" element={<BusinessRoute><ConceptCFrame area="clients"><ClientDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/:id/edit" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes" element={<BusinessRoute><ConceptCPage area="quotes" /></BusinessRoute>} />
            <Route path="/quotes/new" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes/:id" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes/:id/edit" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/money-desk" element={<BusinessRoute><ConceptCFrame area="invoices"><MoneyDeskPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/money" element={<BusinessRoute><ConceptCFrame area="invoices"><MoneyDeskPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/invoices" element={<BusinessRoute><ConceptCPage area="invoices" /></BusinessRoute>} />
            <Route path="/invoices/new" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/invoices/:id" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/sms" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/reports" element={<ReportsRoute><ConceptCFrame area="reports"><ReportsSecurityPage /></ConceptCFrame></ReportsRoute>} />
            <Route path="/integrations" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/settings" element={<BusinessRoute><ConceptCFrame area="settings"><BusinessSettingsPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/contact" element={<PrivateRoute><ConceptCFrame area="settings"><ContactPage /></ConceptCFrame></PrivateRoute>} />
            <Route path="/plans" element={<OwnerRoute><ConceptCFrame area="plans"><PlansPage /></ConceptCFrame></OwnerRoute>} />
            <Route path="/team" element={<TeamRoute><ConceptCPage area="team" /></TeamRoute>} />
            <Route path="/crew-ops" element={<BusinessRoute><ConceptCFrame area="team"><CrewOperationsPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/notifications" element={<BusinessRoute><ConceptCPage area="notifications" /></BusinessRoute>} />
            <Route path="/automation" element={<TeamRoute><Navigate to="/dashboard" replace /></TeamRoute>} />
            <Route path="/automation/runs" element={<TeamRoute><Navigate to="/dashboard" replace /></TeamRoute>} />
            <Route path="/payroll" element={<PayrollRoute><ConceptCPage area="payroll" /></PayrollRoute>} />
            <Route path="/worker/jobs" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobsPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/worker/ops" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerOperationsPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/worker/jobs/:id" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobDetailPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/worker/settings" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerSettingsPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/account-deletion" element={<AccountDeletionPage />} />
            <Route path="/platform-unlock" element={<PlatformUnlock />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
