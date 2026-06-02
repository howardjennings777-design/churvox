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
import PlansPage from "./pages/PlansPage";
import ChurvoxHQPage from "./pages/ChurvoxHQPage";
import PipelinePage from "./pages/PipelinePage";
import CustomerRecordsPage from "./pages/CustomerRecordsPage";
import WorkerJobsPage from "./pages/worker/WorkerJobsPage";
import WorkerJobDetailPage from "./pages/worker/WorkerJobDetailPage";
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
import ConceptCFrame from "./concept-c/ConceptCFrame";
import CommandDeskHomePage from "./pages/CommandDeskHomePage";
import JobsCommandPage from "./pages/JobsCommandPage";
import QuotesCommandPage from "./pages/QuotesCommandPage";
import InvoicesCommandPage from "./pages/InvoicesCommandPage";
import TeamCommandPage from "./pages/TeamCommandPage";
import AutomationCommandPage from "./pages/AutomationCommandPage";
import DispatchCommandPage from "./pages/DispatchCommandPage";
import WorkerMapCommandPage from "./pages/WorkerMapCommandPage";
import IntegrationsCommandPage from "./pages/IntegrationsCommandPage";
import MoneyDeskCommandPage from "./pages/MoneyDeskCommandPage";
import NotificationsCommandPage from "./pages/NotificationsCommandPage";
import ReportsCommandPage from "./pages/ReportsCommandPage";
import SettingsCommandPage from "./pages/SettingsCommandPage";
import SupportCommandPage from "./pages/SupportCommandPage";
import PayrollCommandPage from "./pages/PayrollCommandPage";
import MessageApprovalQueuePage from "./pages/MessageApprovalQueuePage";
import OfflineSyncPage from "./pages/OfflineSyncPage";
import LaunchSalesPolishPage from "./pages/LaunchSalesPolishPage";
import IntegrationProofPage from "./pages/IntegrationProofPage";
import LaunchOpsPage from "./pages/LaunchOpsPage";
import BackupRecoveryPage from "./pages/BackupRecoveryPage";
import PolishChecklistPage from "./pages/PolishChecklistPage";
import DemoModePage from "./pages/DemoModePage";
import PlansCommandPage from "./pages/PlansCommandPage";
import { OnboardingCommandPage, TradePresetsCommandPage, OperatorToolsCommandPage, BillingCommandPage, CrewOpsCommandPage, LaunchCommandPage, WorkerCommandPage } from "./pages/CommandRestPages";
import { hasPlanAtLeast, nicePlanName, requiredPlanLabel } from "./config/churvoxPlans";
import ClientWorkbenchCommandPage from "./pages/ClientWorkbenchCommandPage";

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

function UpgradeRequiredPage({ requiredPlan = "pro", feature = "This feature" }) {
  const { user, normalizedRole } = useAuth();
  const currentPlan = (user?.plan || "none").toLowerCase();
  const requiredName = requiredPlanLabel(requiredPlan);
  const currentName = nicePlanName(currentPlan) || "No plan";

  return (
    <main className="min-h-screen bg-[#f5f7f1] p-4 text-slate-950 md:p-8">
      <section className="mx-auto grid min-h-[72vh] max-w-4xl place-items-center">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
          <div className="mb-4 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            Plan locked
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">
            {feature} needs {requiredName}.
          </h1>
          <p className="mb-6 max-w-2xl text-base font-bold leading-7 text-slate-600">
            Your current plan is {currentName}. This keeps Start, Crew, Operator and Command matched to the pricing page, so customers only see the tools included in their tier.
          </p>
          <div className="flex flex-wrap gap-3">
            {normalizedRole === "owner" || normalizedRole === "manager" ? (
              <Link to="/plans" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">
                View plans
              </Link>
            ) : null}
            <Link to="/dashboard" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">
              Back to Smart Hub
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function PlanTierRoute({ children, requiredPlan = "pro", feature = "This feature" }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/jobs" replace />;
  if (!hasAppAccess) return <Navigate to="/plans" replace />;
  if (isPayroll && requiredPlan !== "enterprise") return <Navigate to="/payroll" replace />;

  const currentPlan = (user?.plan || "none").toLowerCase();
  if (!hasPlanAtLeast(currentPlan, requiredPlan)) {
    return <UpgradeRequiredPage requiredPlan={requiredPlan} feature={feature} />;
  }

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
            <Route path="/operator-tools" element={<Navigate to="/dashboard" replace />} />
            <Route path="/launch-control" element={<Navigate to="/dashboard" replace />} />
            <Route path="/sales-polish" element={<Navigate to="/dashboard" replace />} />
            <Route path="/integration-proof" element={<Navigate to="/dashboard" replace />} />
            <Route path="/launch-ops" element={<Navigate to="/dashboard" replace />} />
            <Route path="/backup-recovery" element={<Navigate to="/dashboard" replace />} />
            <Route path="/polish-checklist" element={<Navigate to="/dashboard" replace />} />
            <Route path="/demo-mode" element={<Navigate to="/dashboard" replace />} />
            <Route path="/sample-mode" element={<Navigate to="/dashboard" replace />} />
            <Route path="/public/proof/:token" element={<PublicProofPackPage />} />
            <Route path="/offline-sync" element={<PrivateRoute><OfflineSyncPage /></PrivateRoute>} />
            <Route path="/dispatch-board" element={<Navigate to="/dispatch" replace />} />
            <Route path="/dispatch/map" element={<BusinessRoute><WorkerMapCommandPage /></BusinessRoute>} />
            <Route path="/crew-map" element={<BusinessRoute><WorkerMapCommandPage /></BusinessRoute>} />
            <Route path="/message-approvals" element={<Navigate to="/dashboard" replace />} />
            <Route path="/trade-presets" element={<Navigate to="/settings" replace />} />
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
            <Route path="/ai-operator" element={<Navigate to="/dashboard" replace />} />
            <Route path="/ai-operator/approvals" element={<Navigate to="/dashboard" replace />} />
            <Route path="/ai-operator/settings" element={<Navigate to="/settings" replace />} />
            <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/churvox-hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />
            <Route path="/admin/hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />
            <Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
            <Route path="/owner/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
            <Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
            <Route path="/dashboard" element={<BusinessRoute><ErrorBoundary fallbackHref="/login" fallbackLabel="Back to login"><CommandDeskHomePage /></ErrorBoundary></BusinessRoute>} />
            <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
            <Route path="/onboarding" element={<BusinessRoute><OnboardingCommandPage /></BusinessRoute>} />
            <Route path="/jobs" element={<BusinessRoute><ErrorBoundary fallbackHref="/dashboard" fallbackLabel="Back to Command Board"><JobsCommandPage /></ErrorBoundary></BusinessRoute>} />
            <Route path="/jobs/new" element={<BusinessRoute><ConceptCFrame area="jobs"><JobFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/jobs/:id" element={<BusinessRoute><ConceptCFrame area="jobs"><JobDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/jobs/:id/edit" element={<BusinessRoute><ConceptCFrame area="jobs"><JobFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/dispatch" element={<Navigate to="/crew-map" replace />} />
            <Route path="/integrations" element={<Navigate to="/settings" replace />} />
            <Route path="/automation" element={<Navigate to="/dashboard" replace />} />
            <Route path="/pipeline" element={<Navigate to="/dashboard" replace />} />
            <Route path="/calendar" element={<Navigate to="/dispatch" replace />} />
            <Route path="/clients/:clientId/workbench" element={<BusinessRoute><ClientWorkbenchCommandPage /></BusinessRoute>} />
            <Route path="/clients" element={<BusinessRoute><ConceptCFrame area="clients"><CustomerRecordsPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/new" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/:id" element={<BusinessRoute><ConceptCFrame area="clients"><ClientDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/clients/:id/edit" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes" element={<BusinessRoute><QuotesCommandPage /></BusinessRoute>} />
            <Route path="/quotes/new" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes/:id" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/quotes/:id/edit" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/money-desk" element={<Navigate to="/invoices" replace />} />
            <Route path="/money" element={<Navigate to="/invoices" replace />} />
            <Route path="/invoices" element={<BusinessRoute><InvoicesCommandPage /></BusinessRoute>} />
            <Route path="/invoices/new" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceFormPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/invoices/:id" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceDetailPage /></ConceptCFrame></BusinessRoute>} />
            <Route path="/sms" element={<BusinessRoute><Navigate to="/dashboard" replace /></BusinessRoute>} />
            <Route path="/reports" element={<ReportsRoute><ReportsCommandPage /></ReportsRoute>} />
            <Route path="/settings" element={<BusinessRoute><SettingsCommandPage /></BusinessRoute>} />
            <Route path="/contact" element={<Navigate to="/support" replace />} />
            <Route path="/support" element={<PrivateRoute><SupportCommandPage /></PrivateRoute>} />
            <Route path="/trust" element={<Navigate to="/support" replace />} />
            <Route path="/plans" element={<OwnerRoute><PlansCommandPage /></OwnerRoute>} />
            <Route path="/billing-confidence" element={<Navigate to="/plans" replace />} />
            <Route path="/team" element={<PlanTierRoute requiredPlan="team" feature="Team workspace"><TeamCommandPage /></PlanTierRoute>} />
            <Route path="/crew-ops" element={<Navigate to="/crew-map" replace />} />
            <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
            <Route path="/automation/runs" element={<Navigate to="/dashboard" replace />} />
            <Route path="/payroll" element={<PlanTierRoute requiredPlan="enterprise" feature="Payroll workspace"><PayrollCommandPage /></PlanTierRoute>} />
            <Route path="/worker/jobs" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobsPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/worker/ops" element={<WorkerRoute><WorkerCommandPage /></WorkerRoute>} />
            <Route path="/worker/jobs/:id" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobDetailPage /></ConceptCFrame></WorkerRoute>} />
            <Route path="/worker/settings" element={<WorkerRoute><WorkerCommandPage /></WorkerRoute>} />
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
