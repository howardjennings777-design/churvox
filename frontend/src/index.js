import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './churvox-product/productTypeScale.css';
import './styles/public-premium-force.css';
import './styles/churvoxMobileAppPolish.css';
import './pages/marketing/PublicMobileFirst.css';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxLogoutNavRuntime';
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxPlansBillingNavClickGuard';
import './runtime/churvoxStripeCheckoutLiveRuntime';
import './runtime/churvoxKiwiCopyGuard';
import './runtime/churvoxSetupCoachKillRuntime';
import './runtime/churvoxPaidLaunchSurfaceRuntime';
import './runtime/churvoxExactFormLabelsRuntime';
import './runtime/churvoxSiteCopyPolishRuntime';
import './runtime/churvoxFirstWinGuideEntryRuntime';

const staticPublicPageRendered = Boolean(
  typeof window !== 'undefined' && window.__CHURVOX_STATIC_PUBLIC_PAGE_RENDERED__ === true
);

if (!staticPublicPageRendered) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

let ownerRuntimeLoaded = false;
let workerRuntimeLoaded = false;
let hqRuntimeLoaded = false;

const ownerRuntimeImports = [
  () => import('./runtime/churvoxPlanPersistenceRuntime'),
  () => import('./runtime/churvoxCommandBrainRuntime'),
  () => import('./runtime/churvoxPaymentSetupRuntime'),
  () => import('./runtime/churvoxOwnerHeaderLogoRuntime'),
  () => import('./churvox-product/productAdminLedgerLanes.css'),
  () => import('./runtime/churvoxOwnerAdminLedgerRuntime'),
  () => import('./runtime/churvoxTrueAdminLedgerFormsRuntime'),
  () => import('./churvox-product/productPageSmartHeaders.css'),
  () => import('./runtime/churvoxPageSmartHeadersRuntime'),
  () => import('./runtime/churvoxPageIdentityRuntime'),
  () => import('./runtime/churvoxWorkerMapPinRuntime'),
  () => import('./runtime/churvoxPaidLaunchSurfaceRuntime'),
  () => import('./runtime/churvoxExactFormLabelsRuntime'),
  () => import('./runtime/churvoxOwnerGuideAuditMarkerRuntime'),
  () => import('./runtime/churvoxLiveOwnerSaveBridgeRuntime'),
  () => import('./churvox-product/productCommandIdentity.css'),
  () => import('./churvox-product/productJobsIdentity.css'),
  () => import('./churvox-product/productClientsMessagesIdentity.css'),
  () => import('./churvox-product/productWorkersTeamIdentity.css'),
  () => import('./churvox-product/productMoneyIdentity.css'),
  () => import('./churvox-product/productOpsIdentity.css'),
  () => import('./churvox-product/productSupportIdentity.css'),
  () => import('./runtime/churvoxOwnerPocketCommandRuntime'),
];

const workerRuntimeImports = [
  () => import('./runtime/churvoxWorkerPreReactShell'),
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./runtime/churvoxWorkerAppCleanRuntime'),
];

const hqRuntimeImports = [
  () => import('./runtime/churvoxPlatformOwnerControlCentreRuntime'),
  () => import('./runtime/churvoxPlatformOwnerTesterInviteRuntime'),
  () => import('./runtime/churvoxHqTesterMobilePolishRuntime'),
  () => import('./runtime/churvoxHqReadyBannerRuntime'),
];

function runImports(imports) {
  imports.forEach((load) => {
    try { load().catch(() => {}); } catch {}
  });
}

function loadOwnerRuntimeWhenInsideApp() {
  if (ownerRuntimeLoaded || typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  const isOwnerApp = path === '/dashboard' || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
  if (!isOwnerApp) return;
  ownerRuntimeLoaded = true;
  runImports(ownerRuntimeImports);
}

function loadWorkerRuntimeWhenInsideWorkerApp() {
  if (workerRuntimeLoaded || typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (!path.startsWith('/worker')) return;
  workerRuntimeLoaded = true;
  runImports(workerRuntimeImports);
}

function loadHqRuntimeWhenInsideHq() {
  if (hqRuntimeLoaded || typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  const isHq = path === '/admin' || path === '/churvox-hq' || path === '/admin/hq' || path === '/owner/dashboard' || path === '/platform-dashboard' || path === '/app-owner' || path === '/admin/usage' || path === '/admin/qa-auditor';
  if (!isHq) return;
  hqRuntimeLoaded = true;
  runImports(hqRuntimeImports);
}

function checkRuntimeLoads() {
  loadOwnerRuntimeWhenInsideApp();
  loadWorkerRuntimeWhenInsideWorkerApp();
  loadHqRuntimeWhenInsideHq();
}

checkRuntimeLoads();
window.addEventListener('popstate', checkRuntimeLoads);
window.addEventListener('hashchange', checkRuntimeLoads);
window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);
[250, 650, 1400, 3000, 6500].forEach((delay) => setTimeout(checkRuntimeLoads, delay));
