import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getDefaultRoute } from "./lib/roles";
import { OWNER_MAINTENANCE_MODE } from "./lib/maintenanceMode";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { trackPlatformVisit } from "./lib/platformTelemetry";

const AppOwnerPage = React.lazy(() => import("./pages/AppOwnerPage"));
const ChurvoxHQPage = React.lazy(() => import("./pages/ChurvoxHQPage"));
const AdminUsagePage = React.lazy(() => import("./pages/AdminUsagePage"));
const PlatformAdminRoute = React.lazy(() => import("./components/admin/PlatformAdminRoute"));
const PlatformUnlock = React.lazy(() => import("./pages/admin/PlatformUnlock"));
const QAAuditorPage = React.lazy(() => import("./pages/admin/QAAuditorPage"));
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const PwaLaunchPage = React.lazy(() => import("./pages/auth/PwaLaunchPage"));
const SignupPage = React.lazy(() => import("./pages/auth/SignupPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/auth/VerifyEmailPage"));
const InviteSetupPage = React.lazy(() => import("./pages/auth/InviteSetupPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/auth/ResetPasswordPage"));
const MaintenancePage = React.lazy(() => import("./pages/MaintenancePage"));
const WorkerNoFussRoute = React.lazy(() => import("./pages/worker/WorkerNoFuss"));
const PublicQuotePage = React.lazy(() => import("./pages/public/PublicQuotePage"));
const PublicInvoicePage = React.lazy(() => import("./pages/public/PublicInvoicePage"));
const PublicClientPortalPage = React.lazy(() => import("./pages/public/PublicClientPortalPage"));
const PublicProofPackPage = React.lazy(() => import("./pages/public/PublicProofPackPage"));
const PublicRequestPage = React.lazy(() => import("./pages/public/PublicRequestPage"));
const HomePage = React.lazy(() => import("./pages/marketing/ExecutiveHomePage"));
const PricingPage = React.lazy(() => import("./pages/marketing/ExecutivePricingPage"));
const FeaturesPage = React.lazy(() => import("./pages/marketing/ExecutiveFeaturesPage"));
const PublicDemoPage = React.lazy(() => import("./pages/marketing/PublicDemoPage"));
const IndustryPage = React.lazy(() => import("./pages/marketing/IndustryPage"));
const ContactPage = React.lazy(() => import("./pages/marketing/ExecutiveContactPage"));
const AboutPage = React.lazy(() => import("./pages/marketing/PublicTrustPages").then((module) => ({ default: module.AboutPage })));
const SecurityPage = React.lazy(() => import("./pages/marketing/PublicTrustPages").then((module) => ({ default: module.SecurityPage })));
const PublicSupportPage = React.lazy(() => import("./pages/marketing/PublicTrustPages").then((module) => ({ default: module.PublicSupportPage })));
const RefundsCancellationsPage = React.lazy(() => import("./pages/marketing/PublicTrustPages").then((module) => ({ default: module.RefundsCancellationsPage })));
const PrivacyPage = React.lazy(() => import("./pages/legal/PrivacyPage"));
const TermsPage = React.lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/legal/PrivacyPolicyPage"));
const TermsOfServicePage = React.lazy(() => import("./pages/legal/TermsOfServicePage"));
const AccountDeletionPage = React.lazy(() => import("./pages/legal/AccountDeletionPage"));
const BillingReturnPage = React.lazy(() => import("./pages/BillingReturnPage"));
const FreshApp = React.lazy(() => import("./churvox-fresh/FreshApp"));
const StandalonePlansRoute = React.lazy(() => import("./StandalonePlansRoute"));
const OfficeTeamLab = React.lazy(() => import("./churvox-office-lab/OfficeTeamLab"));
const OfficeTeamWorkerRoute = React.lazy(() => import("./churvox-office-lab/OfficeTeamWorkerRoute"));

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";

// Stable production fingerprint used by deployment gates. The real owner and
// worker screens are lazy-loaded, so their chunk strings are not guaranteed
// to appear in main.js without this explicit, harmless build marker.
if (typeof window !== "undefined") {
  window.__CHURVOX_LIVE_BUILD__ = Object.freeze({
    version: "churvox-auth-401-storm-repair-20260713b",
    ownerNavigation: "cvOwnerMainNavigation",
    secureCheckout: "Continue to secure checkout",
    workerLogout: "cvWorkerLogout",
    visualRepair: "churvox-owner-visual-repair-20260713f",
  });
}

function isPlatformOwnerUser(user = {}) {
  return String(user?.email || "").trim().toLowerCase() === PLATFORM_OWNER_EMAIL;
}

function verificationPath(user = {}) {
  const params = new URLSearchParams({ pending: "1" });
  const email = String(user?.email || "").trim().toLowerCase();
  if (email) params.set("email", email);
  return `/verify-email?${params.toString()}`;
}

const Spinner = () => (
  <main className="cvAuthLoading min-h-screen bg-[#f5f2ec] p-6 text-center text-slate-950 grid place-items-center">
    <section>
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-t-2 border-orange-500" />
      <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-700">Loading Churvox</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Command Floor</h1>
    </section>
  </main>
);

const AppPage = ({ children }) => <>{children}</>;
const OwnerMaintenance = () => <MaintenancePage workerAccess />;
const OwnerOfficeApp = () => <OfficeTeamLab appMode="owner" />;
const WorkerOfficeApp = () => <OfficeTeamWorkerRoute />;

function PublicRoute({ children }) {
  const { user, loading, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return children;
  return <Navigate to={isPlatformOwnerUser(user) ? "/admin" : getDefaultRoute(normalizedRole)} replace />;
}

function FreshBusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;

  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;
  const currentSearch = typeof window === "undefined" ? "" : window.location.search || "";
  const currentHash = typeof window === "undefined" ? "" : window.location.hash || "";
  const search = new URLSearchParams(currentSearch);
  const isPlans = currentPath === "/plans";
  const isCheckoutReturn = currentSearch.includes("checkout=saved") || currentSearch.includes("checkout=save_failed");
  const isTesterProfileSetup = (currentPath === "/setup" || currentPath === "/setup-guide" || currentPath === "/guide") && (search.get("tester") === "1" || search.get("business_profile") === "1");

  if (user && isWorker) return <Navigate to="/worker/today" replace />;
  if (OWNER_MAINTENANCE_MODE) return <OwnerMaintenance />;
  if (!user) {
    const next = encodeURIComponent(`${currentPath}${currentSearch}${currentHash}` || "/dashboard");
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (user?.email_verified === false && !isPlatformOwnerUser(user)) return <Navigate to={verificationPath(user)} replace />;
  if (isPayroll) return <Navigate to="/dashboard#payroll" replace />;

  const testerAccess = user?.free_tester_access === true || user?.is_tester === true || String(user?.subscription_status || "").toLowerCase() === "tester_free";
  if (!hasAppAccess && !(isPlans || isCheckoutReturn || (testerAccess && isTesterProfileSetup))) return <Navigate to="/plans" replace />;
  if (!hasAppAccess && isTesterProfileSetup && !testerAccess) return <Navigate to="/plans" replace />;
  if (!hasAppAccess && currentPath !== "/plans" && currentHash !== "#setupassistant" && currentHash !== "#firstrun") return <Navigate to="/plans" replace />;
  return <AppPage>{children}</AppPage>;
}

function WorkerRoute({ children }) {
  const { user, loading, isWorker, normalizedRole } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login?worker=1" replace />;
  if (!isWorker) return <Navigate to={isPlatformOwnerUser(user) ? "/admin" : getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
}

function QaAuditorRoute({ children }) {
  const { user, loading, normalizedRole, isPayroll, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (OWNER_MAINTENANCE_MODE) return <OwnerMaintenance />;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = isPlatformOwnerUser(user) || normalizedRole === "owner";
  if (!allowed || isWorker || isPayroll) return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  return <AppPage>{children}</AppPage>;
}

function RoleRedirect() {
  const { user, loading, normalizedRole, isWorker } = useAuth();
  if (loading) return <Spinner />;
  if (user && isWorker) return <Navigate to="/worker/today" replace />;
  if (OWNER_MAINTENANCE_MODE) return <OwnerMaintenance />;
  if (!user) return <Navigate to="/login" replace />;
  if (user?.email_verified === false && !isPlatformOwnerUser(user)) return <Navigate to={verificationPath(user)} replace />;
  return <Navigate to={isPlatformOwnerUser(user) ? "/admin" : getDefaultRoute(normalizedRole)} replace />;
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
          <React.Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/office-team-lab" element={<PlatformAdminRoute><OfficeTeamLab /></PlatformAdminRoute>} />
              <Route path="/office-lab" element={<PlatformAdminRoute><OfficeTeamLab /></PlatformAdminRoute>} />
              <Route path="/new-command-lab" element={<PlatformAdminRoute><OfficeTeamLab /></PlatformAdminRoute>} />
              <Route path="/" element={<HomePage />} />
              <Route path="/app" element={<PwaLaunchPage />} />
              <Route path="/product" element={<FeaturesPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/support" element={<PublicSupportPage />} />
              <Route path="/refunds-cancellations" element={<RefundsCancellationsPage />} />
              <Route path="/industries/:slug" element={<IndustryPage />} />
              <Route path="/demo" element={<PublicDemoPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/request" element={<PublicRequestPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/public/demo" element={<PublicDemoPage />} />
              <Route path="/public/request" element={<PublicRequestPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signin" element={<AppRedirect to="/login" />} />
              <Route path="/sign-in" element={<AppRedirect to="/login" />} />
              <Route path="/signup" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <SignupPage />} />
              <Route path="/signup/" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <SignupPage />} />
              <Route path="/register" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <SignupPage />} />
              <Route path="/register/" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <SignupPage />} />
              <Route path="/verify-email" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <VerifyEmailPage />} />
              <Route path="/forgot-password" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <ForgotPasswordPage />} />
              <Route path="/reset-password" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <ResetPasswordPage />} />
              <Route path="/invite/setup/:token" element={OWNER_MAINTENANCE_MODE ? <OwnerMaintenance /> : <InviteSetupPage />} />
              <Route path="/dashboard" element={<FreshBusinessRoute><OwnerOfficeApp /></FreshBusinessRoute>} />
              <Route path="/legacy-dashboard" element={<FreshBusinessRoute><AppRedirect to="/dashboard" /></FreshBusinessRoute>} />
              <Route path="/plans" element={<FreshBusinessRoute><StandalonePlansRoute /></FreshBusinessRoute>} />
              <Route path="/guide" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
              <Route path="/setup" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
              <Route path="/setup-guide" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>} />
              <Route path="/fresh" element={<AppRedirect to="/dashboard" />} />
              <Route path="/overview" element={<AppRedirect to="/dashboard" />} />
              <Route path="/smart-hub" element={<AppRedirect to="/dashboard" />} />
              <Route path="/command-board" element={<AppRedirect to="/dashboard#command" />} />
              <Route path="/operator-tools" element={<AppRedirect to="/dashboard#command" />} />
              <Route path="/cockpit" element={<AppRedirect to="/dashboard#command" />} />
              <Route path="/jobs" element={<AppRedirect to="/dashboard#work" />} />
              <Route path="/jobs-board" element={<AppRedirect to="/dashboard#work" />} />
              <Route path="/jobs/new" element={<AppRedirect to="/dashboard#work" />} />
              <Route path="/jobs/:id" element={<AppRedirect to="/dashboard#work" />} />
              <Route path="/jobs/:id/edit" element={<AppRedirect to="/dashboard#work" />} />
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
              <Route path="/team" element={<AppRedirect to="/dashboard#staff" />} />
              <Route path="/team-board" element={<AppRedirect to="/dashboard#staff" />} />
              <Route path="/payroll" element={<AppRedirect to="/dashboard#payroll" />} />
              <Route path="/payroll-board" element={<AppRedirect to="/dashboard#payroll" />} />
              <Route path="/dispatch" element={<AppRedirect to="/dashboard#worker" />} />
              <Route path="/dispatch-board" element={<AppRedirect to="/dashboard#worker" />} />
              <Route path="/dispatch/map" element={<AppRedirect to="/dashboard#worker" />} />
              <Route path="/crew-map" element={<AppRedirect to="/dashboard#worker" />} />
              <Route path="/schedule" element={<AppRedirect to="/dashboard#schedule" />} />
              <Route path="/calendar" element={<AppRedirect to="/dashboard#schedule" />} />
              <Route path="/settings" element={<AppRedirect to="/dashboard#settings" />} />
              <Route path="/settings-board" element={<AppRedirect to="/dashboard#settings" />} />
              <Route path="/support-board" element={<AppRedirect to="/dashboard#help" />} />
              <Route path="/offline-sync" element={<AppRedirect to="/dashboard#help" />} />
              <Route path="/onboarding" element={<AppRedirect to="/dashboard#help" />} />
              <Route path="/worker" element={<AppRedirect to="/worker/today" />} />
              <Route path="/worker/today" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/jobs" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/help" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/ops" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/messages" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/jobs/:id" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/worker/settings" element={<WorkerRoute><WorkerOfficeApp /></WorkerRoute>} />
              <Route path="/legacy-worker" element={<AppRedirect to="/legacy-worker/today" />} />
              <Route path="/legacy-worker/today" element={<WorkerRoute><WorkerNoFussRoute /></WorkerRoute>} />
              <Route path="/q/auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
              <Route path="/admin" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />
              <Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} />
              <Route path="/admin/unlock" element={<PlatformAdminRoute><PlatformUnlock /></PlatformAdminRoute>} />
              <Route path="/platform" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} />
              <Route path="/billing/success" element={<BillingReturnBridge />} />
              <Route path="/billing/cancel" element={<BillingReturnBridge cancelled />} />
              <Route path="/billing/cancelled" element={<BillingReturnBridge cancelled />} />
              <Route path="/quote/:token" element={<PublicQuotePage />} />
              <Route path="/invoice/:token" element={<PublicInvoicePage />} />
              <Route path="/client/:token" element={<PublicClientPortalPage />} />
              <Route path="/proof/:token" element={<PublicProofPackPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/legal/terms" element={<TermsOfServicePage />} />
              <Route path="/delete-account" element={<AccountDeletionPage />} />
              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
