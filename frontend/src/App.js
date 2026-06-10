import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppOwnerPage from "./pages/AppOwnerPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { getDefaultRoute } from "./lib/roles";
import "./styles/command-slip-theme.css";
import "./styles/churvox-global-polish.css";

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
import ChurvoxHQPage from "./pages/ChurvoxHQPage";
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
import ChurvoxHelpWidget from "./components/ChurvoxHelpWidget";
import CommandShell from "./components/CommandShell";
import ConceptCFrame from "./concept-c/ConceptCFrame";
import CommandDeskOperatorPage from "./pages/CommandDeskOperatorPageV2";
import JobsCommandPage from "./pages/JobsCommandPage";
import QuotesCommandPage from "./pages/QuotesCommandPage";
import InvoicesCommandPage from "./pages/InvoicesCommandPage";
import TeamRolesWorkbenchPage from "./pages/TeamRolesWorkbenchPage";
import DispatchCommandPage from "./pages/DispatchCommandPage";
import WorkerMapCommandPage from "./pages/WorkerMapCommandPage";
import ReportsCommandPage from "./pages/ReportsCommandPage";
import SettingsCommandPage from "./pages/SettingsCommandPageClean";
import SupportCommandPage from "./pages/SupportCommandPage";
import PayrollCommandPage from "./pages/PayrollCommandPage";
import OfflineSyncPage from "./pages/OfflineSyncPage";
import PlansCommandPage from "./pages/PlansCommandPage";
import BillingReturnPage from "./pages/BillingReturnPage";
import { OnboardingCommandPage, WorkerCommandPage } from "./pages/CommandRestPages";
import { hasPlanAtLeast, nicePlanName, requiredPlanLabel } from "./config/churvoxPlans";
import ClientWorkbenchCommandPage from "./pages/ClientWorkbenchCommandPage";

const Spinner = () => (<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400" /></div>);
const AppPage = ({ children }) => <>{children}</>;
const CommandDeskRoute = ({ fallbackHref = "/dashboard", fallbackLabel = "Back to Command Board" }) => (<ErrorBoundary fallbackHref={fallbackHref} fallbackLabel={fallbackLabel}><CommandDeskOperatorPage /></ErrorBoundary>);
function PrivateRoute({ children }) { const { user, loading } = useAuth(); if (loading) return <Spinner />; return user ? <AppPage>{children}</AppPage> : <Navigate to="/login" replace />; }
function PublicRoute({ children }) { const { user, loading, normalizedRole } = useAuth(); if (loading) return <Spinner />; if (!user) return children; const email = (user?.email || "").toLowerCase(); const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true; if (isPlatformOwner) return <Navigate to="/admin" replace />; return <Navigate to={getDefaultRoute(normalizedRole)} replace />; }
function BusinessRoute({ children }) { const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; if (isWorker) return <Navigate to="/worker/jobs" replace />; if (isPayroll) return <Navigate to="/payroll-board" replace />; if (!hasAppAccess) return <Navigate to="/plans" replace />; return <CommandShell><AppPage>{children}</AppPage></CommandShell>; }
function OwnerRoute({ children }) { const { user, loading, isOwnerUser, isWorker, isPayroll, normalizedRole } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; if (isWorker) return <Navigate to="/worker/jobs" replace />; if (isPayroll) return <Navigate to="/payroll-board" replace />; if (!isOwnerUser) return <Navigate to={getDefaultRoute(normalizedRole)} replace />; return <AppPage>{children}</AppPage>; }
function WorkerRoute({ children }) { const { user, loading, isWorker } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; if (!isWorker) return <Navigate to="/dashboard" replace />; return <AppPage>{children}</AppPage>; }
function ReportsRoute({ children }) { const { user, loading, normalizedRole } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; if (!["owner", "manager", "office_admin"].includes(normalizedRole)) return <Navigate to={getDefaultRoute(normalizedRole)} replace />; return <CommandShell><AppPage>{children}</AppPage></CommandShell>; }
function UpgradeRequiredPage({ requiredPlan = "pro", feature = "This feature" }) { const { user, normalizedRole } = useAuth(); const currentPlan = (user?.plan || "none").toLowerCase(); const requiredName = requiredPlanLabel(requiredPlan); const currentName = nicePlanName(currentPlan) || "No plan"; return <main className="min-h-screen bg-[#f5f7f1] p-4 text-slate-950 md:p-8"><section className="mx-auto grid min-h-[72vh] max-w-4xl place-items-center"><div className="w-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9"><div className="mb-4 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Plan locked</div><h1 className="mb-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">{feature} needs {requiredName}.</h1><p className="mb-6 max-w-2xl text-base font-bold leading-7 text-slate-600">Your current plan is {currentName}. This keeps Start, Crew, Operator and Command matched to the pricing page.</p><div className="flex flex-wrap gap-3">{normalizedRole === "owner" || normalizedRole === "manager" ? <NavigateButton to="/plans">View plans</NavigateButton> : null}<NavigateButton to="/dashboard" subtle>Back to Smart Hub</NavigateButton></div></div></section></main>; }
function NavigateButton({ to, children, subtle = false }) { return <NavigateLink to={to} className={subtle ? "rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline" : "rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline"}>{children}</NavigateLink>; }
function NavigateLink({ to, className, children }) { return <a href={to} className={className}>{children}</a>; }
function PlanTierRoute({ children, requiredPlan = "pro", feature = "This feature" }) { const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; if (isWorker) return <Navigate to="/worker/jobs" replace />; if (!hasAppAccess) return <Navigate to="/plans" replace />; if (isPayroll && requiredPlan !== "enterprise") return <Navigate to="/payroll-board" replace />; const currentPlan = (user?.plan || "none").toLowerCase(); if (!hasPlanAtLeast(currentPlan, requiredPlan)) return <UpgradeRequiredPage requiredPlan={requiredPlan} feature={feature} />; return <CommandShell><AppPage>{children}</AppPage></CommandShell>; }
function QaAuditorRoute({ children }) { const { user, loading, normalizedRole, isPayroll, isWorker } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; const email = (user?.email || "").toLowerCase(); const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true; const allowed = isPlatformOwner || normalizedRole === "owner"; if (!allowed || isWorker || isPayroll) return <Navigate to={getDefaultRoute(normalizedRole)} replace />; return <AppPage>{children}</AppPage>; }
function RoleRedirect() { const { user, loading, normalizedRole } = useAuth(); if (loading) return <Spinner />; if (!user) return <Navigate to="/login" replace />; const email = (user?.email || "").toLowerCase(); const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true; if (isPlatformOwner) return <Navigate to="/admin" replace />; return <Navigate to={getDefaultRoute(normalizedRole)} replace />; }

function App() {
  React.useEffect(() => { const run = async () => { try { const params = new URLSearchParams(window.location.search); const checkout = params.get("checkout"); const sessionId = params.get("session_id") || ""; const plan = (params.get("plan") || "").toLowerCase(); if (!checkout && !sessionId) return; if (checkout === "success") toast.success(plan ? `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is being activated` : "Checkout finished — refreshing plan status"); else if (checkout === "cancelled") toast.info("Checkout cancelled — no changes to your plan"); window.dispatchEvent(new Event("churvox-auth-refresh")); const cleaned = new URL(window.location.href); ["checkout", "session_id", "plan"].forEach((k) => cleaned.searchParams.delete(k)); window.history.replaceState({}, document.title, cleaned.toString()); } catch (err) { console.error("Checkout return handler failed:", err); } }; run(); }, []);
  return <BrowserRouter><AuthProvider><ErrorBoundary><Toaster position="top-right" richColors /><ChurvoxHelpWidget /><Routes>
    <Route path="/operator-tools" element={<Navigate to="/dashboard" replace />} /><Route path="/command-board" element={<Navigate to="/dashboard" replace />} /><Route path="/smart-hub" element={<Navigate to="/dashboard" replace />} />
    <Route path="/public/proof/:token" element={<PublicProofPackPage />} /><Route path="/offline-sync" element={<PrivateRoute><OfflineSyncPage /></PrivateRoute>} />
    <Route path="/dispatch-board" element={<BusinessRoute><DispatchCommandPage /></BusinessRoute>} /><Route path="/dispatch/map" element={<BusinessRoute><WorkerMapCommandPage /></BusinessRoute>} /><Route path="/crew-map" element={<Navigate to="/dispatch-board" replace />} /><Route path="/dispatch" element={<Navigate to="/dispatch-board" replace />} /><Route path="/schedule" element={<Navigate to="/dispatch-board" replace />} /><Route path="/calendar" element={<Navigate to="/dispatch-board" replace />} />
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} /><Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} /><Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} /><Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} /><Route path="/invite/setup/:token" element={<InviteSetupPage />} />
    <Route path="/public/quote/:token" element={<PublicQuotePage />} /><Route path="/public/invoice/:token" element={<PublicInvoicePage />} /><Route path="/client-portal/:token" element={<PublicClientPortalPage />} />
    <Route path="/owner-login" element={<Navigate to="/login" replace />} /><Route path="/admin/login" element={<Navigate to="/login" replace />} /><Route path="/owner" element={<Navigate to="/admin" replace />} /><Route path="/owner/login" element={<Navigate to="/login" replace />} />
    <Route path="/ai-operator" element={<BusinessRoute><CommandDeskRoute /></BusinessRoute>} /><Route path="/ai-operator/approvals" element={<BusinessRoute><CommandDeskRoute /></BusinessRoute>} />
    <Route path="/admin" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} /><Route path="/churvox-hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} /><Route path="/admin/hq" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} /><Route path="/owner/dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} /><Route path="/platform-dashboard" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} /><Route path="/app-owner" element={<PlatformAdminRoute><AppOwnerPage /></PlatformAdminRoute>} /><Route path="/admin/usage" element={<PlatformAdminRoute><AdminUsagePage /></PlatformAdminRoute>} /><Route path="/admin/qa-auditor" element={<QaAuditorRoute><QAAuditorPage /></QaAuditorRoute>} />
    <Route path="/dashboard" element={<BusinessRoute><CommandDeskRoute fallbackHref="/login" fallbackLabel="Back to login" /></BusinessRoute>} /><Route path="/overview" element={<Navigate to="/dashboard" replace />} />
    <Route path="/onboarding" element={<BusinessRoute><OnboardingCommandPage /></BusinessRoute>} /><Route path="/jobs-board" element={<BusinessRoute><ErrorBoundary fallbackHref="/dashboard" fallbackLabel="Back to Command Board"><JobsCommandPage /></ErrorBoundary></BusinessRoute>} /><Route path="/jobs" element={<Navigate to="/jobs-board" replace />} /><Route path="/jobs/new" element={<BusinessRoute><JobFormPage /></BusinessRoute>} /><Route path="/jobs/:id" element={<BusinessRoute><JobDetailPage /></BusinessRoute>} /><Route path="/jobs/:id/edit" element={<BusinessRoute><JobFormPage /></BusinessRoute>} />
    <Route path="/clients/:clientId/workbench" element={<BusinessRoute><ClientWorkbenchCommandPage /></BusinessRoute>} /><Route path="/clients-board" element={<BusinessRoute><CustomerRecordsPage /></BusinessRoute>} /><Route path="/clients" element={<Navigate to="/clients-board" replace />} /><Route path="/clients/new" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} /><Route path="/clients/:id" element={<BusinessRoute><ConceptCFrame area="clients"><ClientDetailPage /></ConceptCFrame></BusinessRoute>} /><Route path="/clients/:id/edit" element={<BusinessRoute><ConceptCFrame area="clients"><ClientFormPage /></ConceptCFrame></BusinessRoute>} />
    <Route path="/quotes-board" element={<BusinessRoute><QuotesCommandPage /></BusinessRoute>} /><Route path="/quotes" element={<Navigate to="/quotes-board" replace />} /><Route path="/quotes/new" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} /><Route path="/quotes/:id" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteDetailPage /></ConceptCFrame></BusinessRoute>} /><Route path="/quotes/:id/edit" element={<BusinessRoute><ConceptCFrame area="quotes"><QuoteFormPage /></ConceptCFrame></BusinessRoute>} />
    <Route path="/invoices-board" element={<BusinessRoute><InvoicesCommandPage /></BusinessRoute>} /><Route path="/invoices" element={<Navigate to="/invoices-board" replace />} /><Route path="/invoices/new" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceFormPage /></ConceptCFrame></BusinessRoute>} /><Route path="/invoices/:id" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceDetailPage /></ConceptCFrame></BusinessRoute>} /><Route path="/invoices/:id/edit" element={<BusinessRoute><ConceptCFrame area="invoices"><InvoiceFormPage /></ConceptCFrame></BusinessRoute>} />
    <Route path="/reports-board" element={<ReportsRoute><ReportsCommandPage /></ReportsRoute>} /><Route path="/reports" element={<Navigate to="/reports-board" replace />} /><Route path="/settings-board" element={<BusinessRoute><SettingsCommandPage /></BusinessRoute>} /><Route path="/settings" element={<Navigate to="/settings-board" replace />} /><Route path="/support-board" element={<BusinessRoute><SupportCommandPage /></BusinessRoute>} /><Route path="/support" element={<Navigate to="/support-board" replace />} />
    <Route path="/plans" element={<BusinessRoute><PlansCommandPage /></BusinessRoute>} /><Route path="/billing" element={<OwnerRoute><BillingReturnPage /></OwnerRoute>} /><Route path="/billing/success" element={<OwnerRoute><BillingReturnPage /></OwnerRoute>} /><Route path="/billing/cancel" element={<OwnerRoute><BillingReturnPage cancelled /></OwnerRoute>} />
    <Route path="/team-board" element={<PlanTierRoute requiredPlan="team" feature="Team workspace"><TeamRolesWorkbenchPage /></PlanTierRoute>} /><Route path="/team" element={<Navigate to="/team-board" replace />} /><Route path="/payroll-board" element={<PlanTierRoute requiredPlan="enterprise" feature="Payroll workspace"><PayrollCommandPage /></PlanTierRoute>} /><Route path="/payroll" element={<Navigate to="/payroll-board" replace />} />
    <Route path="/worker" element={<Navigate to="/worker/jobs" replace />} /><Route path="/worker/jobs" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobsPage /></ConceptCFrame></WorkerRoute>} /><Route path="/worker/ops" element={<WorkerRoute><WorkerCommandPage /></WorkerRoute>} /><Route path="/worker/jobs/:id" element={<WorkerRoute><ConceptCFrame area="worker"><WorkerJobDetailPage /></ConceptCFrame></WorkerRoute>} /><Route path="/worker/settings" element={<WorkerRoute><WorkerCommandPage /></WorkerRoute>} />
    <Route path="/privacy" element={<PrivacyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/privacy-policy" element={<PrivacyPolicyPage />} /><Route path="/terms-of-service" element={<TermsOfServicePage />} /><Route path="/account-deletion" element={<AccountDeletionPage />} /><Route path="/platform-unlock" element={<PlatformUnlock />} />
    <Route path="/" element={<HomePage />} /><Route path="/pricing" element={<PricingPage />} /><Route path="/features" element={<FeaturesPage />} /><Route path="*" element={<RoleRedirect />} />
  </Routes></ErrorBoundary></AuthProvider></BrowserRouter>;
}
export default App;
