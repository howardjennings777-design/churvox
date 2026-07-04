import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
// removed broken css import
// removed broken css import
// removed broken css import
import './runtime/churvoxWorkerPreReactShell';
import './runtime/churvoxNativeTimerRuntime';
import './runtime/churvoxRouteAliasRuntime';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
// Disabled for paid launch: old worker fallback runtime caused worker page DOM freezes.
// import './runtime/churvoxWorkerNoFussHardCleanRuntime';
// Disabled for paid launch: old worker fallback runtime caused worker page DOM freezes.
// import './runtime/churvoxWorkerJobsFallbackRuntime';
// Disabled for paid launch: old worker fallback runtime caused worker page DOM freezes.
// import './runtime/churvoxWorkerBlankFallbackRuntime';
import './runtime/churvoxDrawerClickSafetyRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxPlanPersistenceRuntime';
import './runtime/churvoxFirstRunSetupRuntime';
import './runtime/churvoxCommandPreparedSlipsRuntime';
import './runtime/churvoxLogoutNavRuntime';
// disabled churvoxPlatformOwnerNoiseGuardRuntime
// removed broken css import
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxKiwiCopyGuard';
import './runtime/churvoxPublicBusinessPagesRuntime';
import './runtime/churvoxPublicBusinessPolishRuntime';
// Disabled: top-tier runtime was too broad and affected live layout. Rebuild as proper React components later.
// import './runtime/churvoxTopTierFeaturesRuntime';
import './runtime/churvoxOwnerReadableRecordsRuntime';
// Disabled: billing/tier browser runtimes interfered with navigation/loading. Backend remains source of truth.
// // // disabled churvoxTierUiGuardRuntime
// // // disabled churvoxTrialExpiryRedirectRuntime
// removed broken css import
import './churvox-fresh/optionFPageActionRuntime';
import './churvox-fresh/optionFRestoreTimersRuntime';
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
import './churvox-fresh/optionFControlPagesRuntime';
import './churvox-fresh/optionFControlPagesRuntimeGuard';
import './churvox-fresh/optionFPlansLiveCheckoutRuntimeV2';
import './churvox-fresh/optionFPlansIsolationRuntime';
import './churvox-fresh/optionFStripeManagedPriceDisplayRuntime';
import './churvox-fresh/optionFPlansUsageRuntime';
import './churvox-fresh/optionFBackendSyncRuntime';
import './churvox-fresh/optionFImportExportRuntime';
import './churvox-fresh/optionFXeroActionsRuntime';
import './churvox-fresh/optionFXeroPaymentsRuntime';
import './churvox-fresh/optionFOperationsRuntime';
import './churvox-fresh/optionFAdminBrainRuntime';
import './churvox-fresh/optionFNoLeakRuntime';
import './churvox-fresh/optionFHideSeedDemoRuntime';
import './churvox-fresh/optionFPlainLanguageRuntime';
import './churvox-fresh/optionFWorkerCopyScrubRuntime';
import './churvox-fresh/optionFHideHelperButtonsRuntime';

import './churvox-fresh/optionFTodayScheduleGuardRuntime';
import './churvox-fresh/optionFAutoAdminFlowRuntime';
import './churvox-fresh/optionFDecisionEffectsRuntime';
import './churvox-fresh/optionFRecordHydrationRuntime';
import './churvox-fresh/optionFAiFillMissingRuntime';
import './churvox-fresh/optionFDrawerPersistenceRuntime';
// removed broken css import
// removed broken css import
import './churvox-fresh/optionFReadinessActionFixRuntime';
import './churvox-fresh/optionFApprovalExecutionRuntime';
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed missing owner surface import
import './churvox-fresh/churvoxJobsPagePanelsRuntime';
import './churvox-fresh/churvoxInvoicesPagePanelsRuntime';
import './churvox-fresh/churvoxSettingsPagePanelsRuntime';
import './churvox-fresh/churvoxPlansPagePanelsRuntime';
import './churvox-fresh/churvoxHumanAuditPatchRuntime';
import './runtime/churvoxNoAiWordingRuntime';
// Retired audit imports: these forced the duplicate launch proof rail and circle nav over the live app.
// // removed broken css import
// // removed broken css import
// import './runtime/churvoxPaidLaunchOverflowRuntime';

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
