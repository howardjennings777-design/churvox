import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './churvox-product/productTypeScale.css';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxLogoutNavRuntime';
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxPlansBillingNavClickGuard';
import './runtime/churvoxStripeCheckoutLiveRuntime';
import './runtime/churvoxKiwiCopyGuard';

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
];

const workerRuntimeImports = [
  () => import('./runtime/churvoxWorkerPreReactShell'),
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./churvox-fresh/optionFWorkerCopyScrubRuntime'),
  () => import('./pages/worker/WorkerNoFussPremium.css'),
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
