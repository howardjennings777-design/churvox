import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './churvox-product/productTypeScale.css';
import './styles/public-premium-force.css';
import './styles/churvoxMobileAppPolish.css';
import './styles/churvoxUnifiedLogo.css';
import './styles/churvoxNavBadges.css';
import './styles/churvoxIndustryMode.css';
import './pages/marketing/PublicMobileFirst.css';
import './pages/worker/WorkerFieldFinalFix.css';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxForbiddenExampleScrubRuntime';
import './runtime/churvoxBusinessSystemDashboardAnchorRuntime';

const rootEl = document.getElementById('root');
const staticPublicPageRendered = Boolean(
  typeof window !== 'undefined' && window.__CHURVOX_STATIC_PUBLIC_PAGE_RENDERED__ === true
);

if (rootEl && !staticPublicPageRendered) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

let ownerRuntimeLoaded = false;
let ownerHeavyRuntimeLoaded = false;
let setupRuntimeLoaded = false;
let workerRuntimeLoaded = false;
let hqRuntimeLoaded = false;
let globalHelpersLoaded = false;

const globalHelperImports = [
  () => import('./runtime/authInputVisibilityGuard'),
  () => import('./runtime/churvoxPlainSendGuardRuntime'),
  () => import('./runtime/churvoxLogoutNavRuntime'),
  () => import('./runtime/churvoxPlansCountryRuntime'),
  () => import('./runtime/churvoxPlansBillingNavClickGuard'),
  () => import('./runtime/churvoxStripeCheckoutLiveRuntime'),
  () => import('./runtime/churvoxKiwiCopyGuard'),
  () => import('./runtime/churvoxSetupCoachKillRuntime'),
  () => import('./runtime/churvoxPaidLaunchSurfaceRuntime'),
  () => import('./runtime/churvoxExactFormLabelsRuntime'),
  () => import('./runtime/churvoxSiteCopyPolishRuntime'),
  () => import('./runtime/churvoxFirstWinGuideEntryRuntime'),
];

const ownerFastRuntimeImports = [
  () => import('./runtime/churvoxBusinessSystemSuiteRuntime'),
  () => import('./runtime/churvoxNavBadgesRuntime'),
  () => import('./runtime/churvoxCommandSlipPolishRuntime'),
  () => import('./runtime/churvoxPlanPersistenceRuntime'),
  () => import('./runtime/churvoxPaymentSetupRuntime'),
  () => import('./runtime/churvoxOwnerHeaderLogoRuntime'),
];

const ownerHeavyRuntimeImports = [
  () => import('./runtime/churvoxCommandBrainRuntime'),
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
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./runtime/churvoxWorkerBodyStateRuntime'),
  () => import('./runtime/churvoxNavBadgesRuntime'),
];

const hqRuntimeImports = [
  () => import('./runtime/churvoxPlatformOwnerControlCentreRuntime'),
  () => import('./runtime/churvoxHqUniqueVisitorsRuntime'),
  () => import('./runtime/churvoxHqAcceptedTestersRuntime'),
  () => import('./runtime/churvoxHqBusinessHealthRuntime'),
  () => import('./runtime/churvoxPlatformOwnerTesterInviteRuntime'),
  () => import('./runtime/churvoxHqTesterMobilePolishRuntime'),
  () => import('./runtime/churvoxHqReadyBannerRuntime'),
];

function runImports(imports) {
  imports.forEach((load) => {
    try { load().catch(() => {}); } catch {}
  });
}

function currentPath() {
  return typeof window === 'undefined' ? '' : window.location.pathname || '';
}

function currentParams() {
  try { return new URLSearchParams(window.location.search || ''); } catch { return new URLSearchParams(); }
}

function isPublicFastPath(path) {
  return path === '/' || path === '/product' || path === '/features' || path === '/demo' || path === '/pricing' || path === '/request' || path === '/contact' || path.startsWith('/public') || path === '/login' || path === '/signup' || path === '/forgot-password' || path === '/reset-password';
}

function isSetupProfilePath(path) {
  const q = currentParams();
  return path === '/setup' || path === '/setup-guide' || path === '/guide' || q.get('business_profile') === '1' || q.get('profile') === '1' || q.get('tester') === '1' || q.get('first_setup') === '1';
}

function loadGlobalHelpersAfterPaint() {
  if (globalHelpersLoaded || typeof window === 'undefined') return;
  globalHelpersLoaded = true;
  const path = currentPath();
  const delay = isPublicFastPath(path) ? 2200 : 900;
  window.setTimeout(() => runImports(globalHelperImports), delay);
}

function loadSetupRuntimeWhenNeeded() {
  if (setupRuntimeLoaded || typeof window === 'undefined') return;
  const path = currentPath();
  if (!isSetupProfilePath(path)) return;
  setupRuntimeLoaded = true;
  window.setTimeout(() => runImports([() => import('./runtime/churvoxIndustryModeRuntime')]), 350);
}

function loadOwnerRuntimeWhenInsideApp() {
  if (typeof window === 'undefined') return;
  const path = currentPath();
  const isOwnerApp = path === '/dashboard' || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
  if (!isOwnerApp) return;
  if (!ownerRuntimeLoaded) {
    ownerRuntimeLoaded = true;
    window.setTimeout(() => runImports(ownerFastRuntimeImports), 650);
  }
  loadSetupRuntimeWhenNeeded();
  if (!ownerHeavyRuntimeLoaded && !isSetupProfilePath(path)) {
    ownerHeavyRuntimeLoaded = true;
    window.setTimeout(() => runImports(ownerHeavyRuntimeImports), 2600);
  }
}

function loadWorkerRuntimeWhenInsideWorkerApp() {
  if (workerRuntimeLoaded || typeof window === 'undefined') return;
  const path = currentPath();
  if (!path.startsWith('/worker')) return;
  workerRuntimeLoaded = true;
  runImports(workerRuntimeImports);
}

function loadHqRuntimeWhenInsideHq() {
  if (hqRuntimeLoaded || typeof window === 'undefined') return;
  const path = currentPath();
  const isHq = path === '/admin' || path === '/churvox-hq' || path === '/admin/hq' || path === '/owner/dashboard' || path === '/platform-dashboard' || path === '/app-owner' || path === '/admin/usage' || path === '/admin/qa-auditor';
  if (!isHq) return;
  hqRuntimeLoaded = true;
  window.setTimeout(() => runImports(hqRuntimeImports), 700);
}

function checkRuntimeLoads() {
  loadGlobalHelpersAfterPaint();
  loadOwnerRuntimeWhenInsideApp();
  loadWorkerRuntimeWhenInsideWorkerApp();
  loadHqRuntimeWhenInsideHq();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkRuntimeLoads, { once: true });
  else checkRuntimeLoads();
  window.addEventListener('load', checkRuntimeLoads);
  window.addEventListener('popstate', checkRuntimeLoads);
  window.addEventListener('hashchange', checkRuntimeLoads);
  window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);
  [900, 2600, 7000].forEach((delay) => setTimeout(checkRuntimeLoads, delay));
}
