import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

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
import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import AccountDeletionPage from "./pages/legal/AccountDeletionPage";
import AdminUsagePage from "./pages/AdminUsagePage";
import PlatformAdminRoute from "./components/admin/PlatformAdminRoute";
import PlatformUnlock from "./pages/admin/PlatformUnlock";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { normalizePlan } from "./utils/planRules";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-churvox-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-churvox-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" />
      </div>
    );
  }
  if (!user) return children;
  const email = (user?.email || "").toLowerCase();
  const isPlatformOwner =
    email === "hello@churvox.com" ||
    user?.is_platform_owner === true ||
    user?.is_admin === true;
  return <Navigate to={isPlatformOwner ? "/admin" : "/dashboard"} replace />;
}

function EmployerRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-churvox-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return <Navigate to="/dashboard" replace />;
  return children;
}

function PlanRequiredRoute({ children }) {
  const { user, loading, isWorker } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-churvox-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isWorker) return children;

  const plan = normalizePlan(user?.plan);
  if (!plan || plan === "none") {
    return <Navigate to="/plans" replace />;
  }
  return children;
}

function App() {

  React.useEffect(() => {
    const syncCheckoutPlan = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        if (!sessionId) return;

        const token = localStorage.getItem("token");
        const backendUrl = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
        if (!token || !backendUrl) return;

        await fetch(`${backendUrl}/api/billing/confirm-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete("session_id");
        window.history.replaceState({}, "", cleaned.toString());

        window.location.reload();
      } catch (err) {
        console.error("Checkout sync failed", err);
      }
    };

    syncCheckoutPlan();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/owner-login" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/owner" element={<Navigate to="/admin" replace />} />
          <Route path="/owner/login" element={<Navigate to="/login" replace />} />
          <Route path="/invite/setup/:token" element={<InviteSetupPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

          <Route
            path="/admin"
            element={
              <PlatformAdminRoute>
                <AppOwnerPage />
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/owner/dashboard"
            element={
              <PlatformAdminRoute>
                <AppOwnerPage />
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/platform-dashboard"
            element={
              <PlatformAdminRoute>
                <AppOwnerPage />
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/app-owner"
            element={
              <PlatformAdminRoute>
                <AppOwnerPage />
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/usage"
            element={
              <PlatformAdminRoute>
                <AdminUsagePage />
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/owner/usage"
            element={
              <PlatformAdminRoute>
                <AdminUsagePage />
              </PlatformAdminRoute>
            }
          />

          <Route path="/dashboard" element={<PlanRequiredRoute><DashboardPage /></PlanRequiredRoute>} />
          <Route path="/jobs" element={<PlanRequiredRoute><JobsPage /></PlanRequiredRoute>} />
          <Route path="/jobs/new" element={<PlanRequiredRoute><JobFormPage /></PlanRequiredRoute>} />
          <Route path="/jobs/:id" element={<PlanRequiredRoute><JobDetailPage /></PlanRequiredRoute>} />
          <Route path="/jobs/:id/edit" element={<PlanRequiredRoute><JobFormPage /></PlanRequiredRoute>} />
          <Route path="/calendar" element={<PlanRequiredRoute><CalendarPage /></PlanRequiredRoute>} />
          <Route path="/clients" element={<EmployerRoute><ClientsPage /></EmployerRoute>} />
          <Route path="/clients/new" element={<EmployerRoute><ClientFormPage /></EmployerRoute>} />
          <Route path="/clients/:id" element={<EmployerRoute><ClientDetailPage /></EmployerRoute>} />
          <Route path="/clients/:id/edit" element={<EmployerRoute><ClientFormPage /></EmployerRoute>} />
          <Route path="/team" element={<EmployerRoute><TeamPage /></EmployerRoute>} />
          <Route path="/quotes" element={<EmployerRoute><QuotesPage /></EmployerRoute>} />
          <Route path="/quotes/new" element={<EmployerRoute><QuoteFormPage /></EmployerRoute>} />
          <Route path="/quotes/:id" element={<EmployerRoute><QuoteDetailPage /></EmployerRoute>} />
          <Route path="/quotes/:id/edit" element={<EmployerRoute><QuoteFormPage /></EmployerRoute>} />
          <Route path="/invoices" element={<EmployerRoute><InvoicesPage /></EmployerRoute>} />
          <Route path="/invoices/new" element={<EmployerRoute><InvoiceFormPage /></EmployerRoute>} />
          <Route path="/invoices/:id" element={<EmployerRoute><InvoiceDetailPage /></EmployerRoute>} />
          <Route path="/sms" element={<EmployerRoute><SMSPage /></EmployerRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/plans" element={<PrivateRoute><PlansPage /></PrivateRoute>} />

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />
          <Route path="/platform-unlock" element={<PlatformUnlock />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
