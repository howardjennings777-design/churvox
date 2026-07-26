import React from 'react';
import ReactDOM from 'react-dom/client';
import './runtime/churvoxDateInputIsoGuardRuntime';
import './runtime/churvoxPublicHelpRouteGuardRuntime';
import './runtime/churvoxExplicitLogoutGuardRuntime';
import './runtime/churvoxControlBoardMobileLogoutRuntime';
import './runtime/churvoxProtectedFetchAuthGuardRuntime';
import './runtime/churvoxVisibleControlTextRuntime';
import './runtime/churvoxLegacyHostExitRuntime';
import './runtime/churvoxStripeCheckoutLiveRuntime';
import './runtime/churvoxStripePlanIdentityRuntime';
import App from './App';
import API_BASE from './lib/apiBase';
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
import './runtime/churvoxBusinessSystemDashboardAnchorRuntime';
import './runtime/churvoxTesterApplicationAttributionRuntime';
import './runtime/churvoxFoundingTesterPopupRuntime';

const CHURVOX_DEPLOY_BUILD = 'churvox-tester-attribution-20260720';
const CHURVOX_JOB_DONE_DEPLOY_BUILD = 'churvox-job-done-live-v2-20260714';
if (typeof window !== 'undefined') {
  window.__CHURVOX_DEPLOY_BUILD__ = CHURVOX_DEPLOY_BUILD;
  window.__CHURVOX_JOB_DONE_DEPLOY_BUILD__ = CHURVOX_JOB_DONE_DEPLOY_BUILD;
}

function preconnectBackend() {
  if (typeof document === 'undefined' || !API_BASE) return;
  const href = String(API_BASE).replace(/\/$/, '');
  if (!href || document.querySelector(`link[data-churvox-api-preconnect="${href}"]`)) return;
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = href;
  preconnect.crossOrigin = 'anonymous';
  preconnect.dataset.churvoxApiPreconnect = href;
  document.head.appendChild(preconnect);
  try {
    const url = new URL(href);
    const dns = document.createElement('link');
    dns.rel = 'dns-prefetch';
    dns.href = `//${url.host}`;
    dns.dataset.churvoxApiPreconnect = href;
    document.head.appendChild(dns);
  } catch {}
}

preconnectBackend();

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
let setupRuntimeLoaded = false;
let workerRuntimeLoaded = false;
let hqRuntimeLoaded = false;
let globalHelpersLoaded = false;

const globalHelperImports = [
  () => import('./runtime/authInputVisibilityGuard'),
  () => import('./runtime/churvoxPlainSendGuardRuntime'),
  () => import('./runtime/churvoxPlansCountryRuntime'),
  () => import('./runtime/churvoxPlansBillingNavClickGuard'),
  () => import('./runtime/churvoxPublicPricingLinkGuardRuntime'),
  () => import('./runtime/churvoxFirstWinGuideEntryRuntime'),
];

const ownerFastRuntimeImports = [
  () => import('./runtime/churvoxDrawerRecordActionsRuntime'),
  () => import('./runtime/churvoxInternalSupportRuntime'),
  () => import('./runtime/churvoxWorkersMapRestoreRuntime'),
  () => import('./runtime/churvoxPlanPersistenceRuntime'),
  () => import('./runtime/churvoxPaymentSetupRuntime'),
  () => import('./runtime/churvoxPlansUsageTruthRuntime'),
  () => import('./runtime/churvoxProductPlansUsageBridgeRuntime'),
  () => import('./runtime/churvoxBillingPortalRuntime'),
];

const ownerHeavyRuntimeImports = [];

const workerRuntimeImports = [
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./runtime/churvoxWorkerBodyStateRuntime'),
  () => import('./runtime/churvoxNavBadgesRuntime'),
  () => import('./runtime/churvoxVisibleLogoutRuntime'),
];

// The rebuilt React HQ owns its complete UI and data wiring. Legacy HQ runtimes
// are deliberately disabled so no extra navigation, overlays or duplicate HQs
// can be injected after the single console has rendered.
const hqRuntimeImports = [];

function runImports(imports) {
  imports.forEach((load) => {
    try { load().catch(() => {}); } catch {}
  });
}

function currentPath() { return typeof window === 'undefined' ? '' : window.location.pathname || ''; }
function protectedAuthReady() { return typeof window !== 'undefined' && window.__CHURVOX_AUTH_STATE__?.status === 'authenticated'; }
function currentParams() { try { return new URLSearchParams(window.location.search || ''); } catch { return new URLSearchParams(); } }
function isPublicFastPath(path) { return path === '/' || path === '/product' || path === '/features' || path === '/demo' || path === '/pricing' || path === '/request' || path === '/contact' || path === '/security' || path === '/support' || path.startsWith('/public') || path.startsWith('/industries') || path === '/login' || path === '/signup' || path === '/forgot-password' || path === '/reset-password'; }
function isSetupProfilePath(path) { const q = currentParams(); return path === '/setup' || path === '/setup-guide' || path === '/guide' || q.get('business_profile') === '1' || q.get('profile') === '1' || q.get('tester') === '1' || q.get('first_setup') === '1'; }

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
  if (!isOwnerApp || !protectedAuthReady()) return;
  if (!ownerRuntimeLoaded) {
    ownerRuntimeLoaded = true;
    window.setTimeout(() => runImports(ownerFastRuntimeImports), 500);
  }
  loadSetupRuntimeWhenNeeded();
  if (ownerHeavyRuntimeImports.length) window.setTimeout(() => runImports(ownerHeavyRuntimeImports), 4200);
}

function loadWorkerRuntimeWhenInsideWorkerApp() {
  if (workerRuntimeLoaded || typeof window === 'undefined') return;
  const path = currentPath();
  if (!path.startsWith('/worker') || !protectedAuthReady()) return;
  workerRuntimeLoaded = true;
  runImports(workerRuntimeImports);
}

function loadHqRuntimeWhenInsideHq() {
  if (hqRuntimeLoaded || typeof window === 'undefined') return;
  const path = currentPath();
  const isHq = path === '/admin' || path === '/churvox-hq' || path === '/admin/hq' || path === '/owner/dashboard' || path === '/platform-dashboard' || path === '/app-owner' || path === '/admin/usage' || path === '/admin/qa-auditor' || path === '/platform';
  if (!isHq) return;
  hqRuntimeLoaded = true;
  runImports(hqRuntimeImports);
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
  window.addEventListener('popstate', checkRuntimeLoads);
  window.addEventListener('hashchange', checkRuntimeLoads);
  window.addEventListener('churvox-auth-state', checkRuntimeLoads);
  window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);
  window.addEventListener('churvox-worker-app-ready', checkRuntimeLoads);
}
