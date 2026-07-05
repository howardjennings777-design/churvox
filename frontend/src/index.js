import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './components/recordWorkspacePopup.css';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxLogoutNavRuntime';
import './pages/marketing/PublicAdminOS.css';
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxKiwiCopyGuard';
import './runtime/churvoxPublicBusinessPagesRuntime';
import './runtime/churvoxPublicBusinessPolishRuntime';
import './churvox-product/productModern.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {});
  });
}

const staticPublicPageRendered = Boolean(
  typeof window !== 'undefined' && window.__CHURVOX_STATIC_PUBLIC_PAGE_RENDERED__ === true
);

if (!staticPublicPageRendered) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
      <RecordWorkspacePopupBridgeV2 />
    </React.StrictMode>
  );
}

let ownerRuntimeLoaded = false;
let workerRuntimeLoaded = false;
let plansRuntimeLoaded = false;

const ownerRuntimeImports = [
  () => import('./runtime/churvoxPlansNavRuntime'),
  () => import('./runtime/churvoxWorkerPreReactShell'),
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./runtime/churvoxRouteAliasRuntime'),
  () => import('./runtime/churvoxDrawerClickSafetyRuntime'),
  () => import('./runtime/churvoxPlanPersistenceRuntime'),
  () => import('./runtime/churvoxFirstRunSetupRuntime'),
  () => import('./runtime/churvoxCommandPreparedSlipsRuntime'),
  () => import('./runtime/churvoxPlatformOwnerNoiseGuardRuntime'),
  () => import('./churvox-fresh/optionFPageActionRuntime'),
  () => import('./churvox-fresh/optionFRestoreTimersRuntime'),
  () => import('./churvox-fresh/optionFControlPagesRuntime'),
  () => import('./churvox-fresh/optionFControlPagesRuntimeGuard'),
  () => import('./churvox-fresh/optionFPlansLiveCheckoutRuntimeV2'),
  () => import('./churvox-fresh/optionFPlansIsolationRuntime'),
  () => import('./churvox-fresh/optionFStripeManagedPriceDisplayRuntime'),
  () => import('./churvox-fresh/optionFPlansUsageRuntime'),
  () => import('./churvox-fresh/optionFBackendSyncRuntime'),
  () => import('./churvox-fresh/optionFImportExportRuntime'),
  () => import('./churvox-fresh/optionFXeroActionsRuntime'),
  () => import('./churvox-fresh/optionFXeroPaymentsRuntime'),
  () => import('./churvox-fresh/optionFOperationsRuntime'),
  () => import('./churvox-fresh/optionFAdminBrainRuntime'),
  () => import('./churvox-fresh/optionFNoLeakRuntime'),
  () => import('./churvox-fresh/optionFHideSeedDemoRuntime'),
  () => import('./churvox-fresh/optionFPlainLanguageRuntime'),
  () => import('./churvox-fresh/optionFWorkerCopyScrubRuntime'),
  () => import('./churvox-fresh/optionFHideHelperButtonsRuntime'),
  () => import('./churvox-fresh/optionFCommandCleanupRuntime'),
  () => import('./churvox-fresh/optionFTodayScheduleGuardRuntime'),
  () => import('./churvox-fresh/optionFAutoAdminFlowRuntime'),
  () => import('./churvox-fresh/optionFDecisionEffectsRuntime'),
  () => import('./churvox-fresh/optionFRecordHydrationRuntime'),
  () => import('./churvox-fresh/optionFAiFillMissingRuntime'),
  () => import('./churvox-fresh/optionFDrawerPersistenceRuntime'),
  () => import('./churvox-fresh/optionFReadinessActionFixRuntime'),
  () => import('./churvox-fresh/optionFApprovalExecutionRuntime'),
  () => import('./runtime/churvoxPaidLaunchOverflowRuntime'),
  () => import('./runtime/churvoxOwnerVisualStabilityRuntime'),
  () => import('./runtime/churvoxOwnerRecoverySlipRuntime'),
  () => import('./runtime/churvoxOwnerRecoveryActionSlipRuntime'),
  () => import('./runtime/churvoxOwnerPageContainmentRuntime'),
  () => import('./runtime/churvoxOwnerProperPageLayoutsRuntime'),
  () => import('./runtime/churvoxOwnerProperPageShieldRuntime'),
  () => import('./runtime/churvoxOwnerProperFormsRuntime'),
  () => import('./runtime/churvoxOwnerProperFormsTopRuntime'),
  () => import('./runtime/churvoxProductPremiumVisualRuntime'),
  () => import('./runtime/churvoxCenterSlipsRuntime'),
  () => import('./runtime/churvoxOwnerButtonWiringRuntime'),
];

const workerRuntimeImports = [
  () => import('./runtime/churvoxWorkerPreReactShell'),
  () => import('./runtime/churvoxNativeTimerRuntime'),
  () => import('./churvox-fresh/optionFWorkerCopyScrubRuntime'),
];

function runImports(imports) {
  imports.forEach((load) => {
    try { load().catch(() => {}); } catch {}
  });
}

function isPlansPage() {
  if (typeof window === 'undefined') return false;
  return (window.location.pathname === '/dashboard' && window.location.hash === '#plans') || window.location.pathname === '/plans';
}

function loadPlansRuntimeWhenOnPlans() {
  if (plansRuntimeLoaded || !isPlansPage()) return;
  plansRuntimeLoaded = true;
  import('./runtime/churvoxPlansNavRuntime').catch(() => {});
}

function loadOwnerRuntimeWhenInsideApp() {
  if (ownerRuntimeLoaded || typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  const isOwnerApp = path === '/dashboard' || path === '/plans' || path.startsWith('/dashboard');
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
  loadPlansRuntimeWhenOnPlans();
  loadOwnerRuntimeWhenInsideApp();
  loadWorkerRuntimeWhenInsideWorkerApp();
}

checkRuntimeLoads();
window.addEventListener('popstate', checkRuntimeLoads);
window.addEventListener('hashchange', checkRuntimeLoads);
window.addEventListener('churvox-owner-app-ready', checkRuntimeLoads);
setTimeout(checkRuntimeLoads, 300);
setTimeout(checkRuntimeLoads, 800);
setTimeout(checkRuntimeLoads, 1800);