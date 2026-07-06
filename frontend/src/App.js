import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getDefaultRoute } from "./lib/roles";
import AppOwnerPage from "./pages/AppOwnerPage";
import ChurvoxHQPage from "./pages/ChurvoxHQPage";
import AdminUsagePage from "./pages/AdminUsagePage";
import PlatformAdminRoute from "./components/admin/PlatformAdminRoute";
import PlatformUnlock from "./pages/admin/PlatformUnlock";
import QAAuditorPage from "./pages/admin/QAAuditorPage";
import LoginPage from "./pages/auth/LoginPage";
import PwaLaunchPage from "./pages/auth/PwaLaunchPage";
import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import InviteSetupPage from "./pages/auth/InviteSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import WorkerNoFussRoute from "./pages/worker/WorkerNoFuss";
import PublicQuotePage from "./pages/public/PublicQuotePage";
import PublicInvoicePage from "./pages/public/PublicInvoicePage";
import PublicClientPortalPage from "./pages/public/PublicClientPortalPage";
import PublicProofPackPage from "./pages/public/PublicProofPackPage";
import PublicRequestPage from "./pages/public/PublicRequestPage";
import HomePage from "./pages/marketing/ExecutiveHomePage";
import PricingPage from "./pages/marketing/ExecutivePricingPage";
import FeaturesPage from "./pages/marketing/ExecutiveFeaturesPage";
import PublicDemoPage from "./pages/marketing/PublicDemoPage";
import ContactPage from "./pages/marketing/ExecutiveContactPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import AccountDeletionPage from "./pages/legal/AccountDeletionPage";
import BillingReturnPage from "./pages/BillingReturnPage";
import FreshApp from "./churvox-fresh/FreshApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { trackPlatformVisit } from "./lib/platformTelemetry";

const Spinner = () => (
  <main className="min-h-screen bg-[#f5f2ec] p-6 text-center text-slate-950 grid place-items-center">
    <section>
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-t-2 border-orange-500" />
      <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-700">Loading Churvox</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Command Floor</h1>
    </section>
  </main>
);

const AppPage = ({ children }) => <>{children}</>;

function PublicRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return children;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  return <Navigate to={isPlatformOwner ? "/admin" : getDefaultRoute(normalizedRole)} replace />;
}

function FreshBusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;
  const setupAccess = typeof window !== "undefined" && (
    window.location.pathname === "/plans" ||
    window.location.pathname === "/guide" ||
    window.location.pathname === "/setup" ||
    window.location.pathname === "/setup-guide" ||
    window.location.search.includes("first_setup=1") ||
    window.location.search.includes("checkout=saved") ||
    window.location.search.includes("checkout=save_failed") ||
    window.location.hash === "#setupassistant" ||
    window.location.hash === "#firstrun"
  );
  if (!user && setupAccess) return <AppPage>{children}</AppPage>;
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/worker/today" replace />;
  if (isPayroll) return <Navigate to="/dashboard#payroll" replace />;
  if (!hasAppAccess && !setupAccess) return <Navigate to="/plans" replace />;
  return <AppPage>{children}</AppPage>;
}

function WorkerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
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
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  return <Navigate to={isPlatformOwner ? "/admin" : getDefaultRoute(normalizedRole)} replace />;
}

function BillingReturnBridge({ cancelled = false }) {
  return <BillingReturnPage cancelled={cancelled} />;
}

function AppRedirect({ to }) {
  return <Navigate to={to} replace />;
}

function App() {
  React.useEffect(() => { trackPlatformVisit(); }, []);
  React.useEffect(() => {
    try {
      if (window.location.pathname.startsWith("/billing") || window.location.pathname === "/plans") return;
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const sessionId = params.get("session_id") || "";
      const plan = (params.get("plan") || "").toLowerCase();
      if (!checkout && !sessionId) return;
      if (checkout === "success") toast.success(plan ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is being activated` : "Checkout finished — refreshing plan status");
      if (checkout === "cancelled") toast.info("Checkout cancelled — no changes to your plan");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      const cleaned = new URL(window.location.href);
      ["checkout", "session_id", "plan"].forEach((key) => cleaned.searchParams.delete(key));
      window.history.replaceState({}, document.title, cleaned.toString());
    } catch (err) {
      console.error("Checkout return handler failed:", err);
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app" element={<PwaLaunchPage />} />
            <Route path="/product" element={<FeaturesPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/demo" element={<PublicDemoPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/request" element={<PublicRequestPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/public/demo" element={<PublicDemoPage />} />
            <Route path="/public/request" element={<PublicRequestPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<AppRedirect to="/login" />} />
            <Route path="/sign-in" element={<AppRedirect to="/login" />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signup/" element={<SignupPage />} />
            <Route path="/register" element={<SignupPage />} />
            <Route path="/register/" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/invite/setup/:token" element={<InviteSetupPage />} />

            <Route path="/dashboard" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
            <Route path="/plans" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
            <Route path="/guide" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
            <Route path="/setup" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
            <Route path="/setup-guide" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
            <Route path="/fresh" element={<AppRedirect to="/dashboard" />} />
            <Route path="/overview" element={<AppRedirect to="/dashboard" />} />
            <Route path="/smart-hub" element={<AppRedirect to="/dashboard" />} />
            <Route path="/command-board" element={<AppRedirect to="/dashboard#command" />} />
            <Route path="/operator-tools" element={<AppRedirect to="/dashboard#command" />} />
            <Route path="/cockpit" element={<AppRedirect to="/dashboard#command" />} />
            <Route path="/ai-operator" element={<AppRedirect to="/dashboard#command" />} />
            <Route path="/ai-operator/approvals" element={<AppRedirect to="/dashboard#command" />} />

            <Route path="/jobs" element={<AppRedirect to="/dashboard#jobs" />} />
            <Route path="/jobs-board" element={<AppRedirect to="/dashboard#jobs" />} />
            <Route path="/jobs/new" element={<AppRedirect to="/dashboard#jobs" />} />
            <Route path="/jobs/:id" element={<AppRedirect to="/dashboard#jobs" />} />
            <Route path="/jobs/:id/edit" element={<AppRedirect to="/dashboard#jobs" />} />
            <Route path="/clients" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/clients-board" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/clients/new" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/clients/:id" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/clients/:id/edit" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/clients/:clientId/workbench" element={<AppRedirect to="/dashboard#clients" />} />
            <Route path="/quotes" element={<AppRedirect to="/dashboard#quotes" />} />
            <Route path="/quotes-board" element={<AppRedirect to="/dashboard#quotes" />} />
            <Route path="/quotes/new" element={<AppRedirect to="/dashboard#quotes" />} />
            <Route path="/quotes/:id" element={<AppRedirect to="/dashboard#quotes" />} />
            <Route path="/quotes/:id/edit" element={<AppRedirect to="/dashboard#quotes" />} />
            <Route path="/invoices" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/invoices-board" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/invoices/new" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/invoices/:id" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/invoices/:id/edit" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/reports" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/reports-board" element={<AppRedirect to="/dashboard#invoices" />} />
            <Route path="/team" element={<AppRedirect to="/dashboard#team" />} />
            <Route path="/team-board" element={<AppRedirect to="/dashboard#team" />} />
            <Route path="/payroll" element={<AppRedirect to="/dashboard#payroll" />} />
            <Route path="/payroll-board" element={<AppRedirect to="/dashboard#payroll" />} />
            <Route path="/dispatch" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/dispatch-board" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/dispatch/map" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/crew-map" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/schedule" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/calendar" element={<AppRedirect to="/dashboard#workers" />} />
            <Route path="/settings" element={<AppRedirect to="/dashboard#settings" />} />
            <Route path="/settings-board" element={<AppRedirect to="/dashboard#settings" />} />
            <Route path="/support" element={<AppRedirect to="/dashboard#support" />} />
            <Route path="/support-board" element={<AppRedirect to="/dashboard#support" />} />
            <Route path="/offline-sync" element={<AppRedirect to="/dashboard#support" />} />
            <Route path="/onboarding" element={<AppRedirect to="/dashboard#support" />} />

            <Route path="/worker" element={<AppRedirect to="/worker/today" />} />
            <Route path="/worker/today" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/jobs" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/help" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/ops" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/messages" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/jobs/:id" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/settings" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
            <Route path="/worker/profile" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />

            <Route path="/public/quote/:token" element={<PublicQuotePage />} />
            <Route path="/public/invoice/:token" element={<PublicInvoicePage />} />
            <Route path="/client-portal/:token" element={<PublicClientPortalPage />} />
            <Route path="/public/proof/:token" element={<PublicProofPackPage />} />
            <Route path="/billing" element={<BillingReturnBridge />} />
            <Route path="/billing/success" element={<BillingReturnBridge />} />
            <Route path="/billing/cancel" element={<BillingReturnBridge cancelled />} />

            <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/churvox-hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />
            <Route path="/admin/hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />
            <Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
            <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
            <Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
            <Route path="/owner-login" element={<AppRedirect to="/login" />} />
            <Route path="/admin/login" element={<AppRedirect to="/login" />} />
            <Route path="/owner" element={<AppRedirect to="/admin" />} />
            <Route path="/owner/login" element={<AppRedirect to="/login" />} />
            <Route path="/platform-unlock" element={<PlatformUnlock />} />

            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/account-deletion" element={<AccountDeletionPage />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
