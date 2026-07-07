import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './churvox-product/productTypeScale.css';
import './styles/public-premium-force.css';
import './styles/churvoxMobileAppPolish.css';
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
import './runtime/churvoxPlatformOwnerControlCentreRuntime';
import './runtime/churvoxPlatformOwnerTesterInviteRuntime';
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

const ownerRuntimeImports = [
  () => import('./runtime/churvoxPlanPersistenceRuntime'),
  () => import('./runtime/churvoxCommandBrainRuntime'),
  () => import('./runtime/churvoxPaymentSetupRuntime'),
  () => import('./runtime/churvoxOwnerHeaderLogoRuntime'),
  () => import('./churvox-product/productAdminLedgerLanes.css'),
  () => import('./runtime/churvoxOwnerAdminLedgerRuntime'),
  () => import('./runtime/churvoxTrueAdminLedgerFormsRuntime'),
  () => import('./churvox-product/productJobLedger.css'),
  () => import('./runtime/churvoxOwnerJobLedgerRuntime'),
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
];

const workerRuntimeImports = [
  () => import('./runtime/churvoxWorkerPreReactShell'),
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./runtime/churvoxWorkerSendBackNoticeRuntime'),
  () => import('./churvox-fresh/optionFWorkerCopyScrubRuntime'),
  () => import('./pages/worker/WorkerNoFussPremium.css'),
  () => import('./pages/worker/WorkerRealLogo.css'),
  () => import('./pages/worker/WorkerAdminLedger.css'),
  () => import('./runtime/churvoxWorkerAdminLedgerRuntime'),
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

function checkRuntimeLoads() {
  loadOwnerRuntimeWhenInsideApp();
  loadWorkerRuntimeWhenInsideWorkerApp();
}

checkRuntimeLoads();
window.addEventListener('popstate', checkRuntimeLoads);
window.addEventListener('hashchange', checkRuntimeLoads);
window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);
setTimeout(checkRuntimeLoads, 300);
setTimeout(checkRuntimeLoads, 800);
setInterval(checkRuntimeLoads, 1200);
