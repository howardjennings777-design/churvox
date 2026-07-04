import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import './runtime/churvoxWorkerPreReactShell';
import './runtime/churvoxNativeTimerRuntime';
import './runtime/churvoxRouteAliasRuntime';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxDrawerClickSafetyRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxPlanPersistenceRuntime';
import './runtime/churvoxFirstRunSetupRuntime';
import './runtime/churvoxCommandPreparedSlipsRuntime';
import './runtime/churvoxLogoutNavRuntime';
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxKiwiCopyGuard';
import './runtime/churvoxPublicBusinessPagesRuntime';
import './runtime/churvoxPublicBusinessPolishRuntime';
import './runtime/churvoxOwnerReadableRecordsRuntime';
import './churvox-fresh/optionFPageActionRuntime';
import './churvox-fresh/optionFRestoreTimersRuntime';
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
import './churvox-fresh/optionFReadinessActionFixRuntime';
import './churvox-fresh/optionFApprovalExecutionRuntime';
import './churvox-fresh/churvoxJobsPagePanelsRuntime';
import './churvox-fresh/churvoxInvoicesPagePanelsRuntime';
import './churvox-fresh/churvoxSettingsPagePanelsRuntime';
import './churvox-fresh/churvoxPlansPagePanelsRuntime';
import './churvox-fresh/churvoxHumanAuditPatchRuntime';
import './runtime/churvoxNoAiWordingRuntime';

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
