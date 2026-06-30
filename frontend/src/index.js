import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './components/recordWorkspacePopup.css';
import './runtime/churvoxNativeTimerRuntime';
import './runtime/churvoxRouteAliasRuntime';
import './runtime/authInputVisibilityGuard';
import './runtime/churvoxLaunchSplashRuntime';
import './runtime/churvoxWorkerNoFussHardCleanRuntime';
import './runtime/churvoxWorkerJobsFallbackRuntime';
import './runtime/churvoxWorkerBlankFallbackRuntime';
import './runtime/churvoxDrawerClickSafetyRuntime';
import './runtime/churvoxPlainSendGuardRuntime';
import './runtime/churvoxPlanPersistenceRuntime';
import './runtime/churvoxFirstRunSetupRuntime';
import './runtime/churvoxCommandPreparedSlipsRuntime';
import './pages/marketing/PublicAdminOS.css';
import './runtime/churvoxPlansCountryRuntime';
import './runtime/churvoxKiwiCopyGuard';
import './churvox-fresh/optionFPageActionRuntime';
import './churvox-fresh/optionFRestoreTimersRuntime';
import './churvox-fresh/optionCCommandBarFix.css';
import './churvox-fresh/optionCPolish.css';
import './churvox-fresh/optionCProperFinish.css';
import './churvox-fresh/optionDLaunch.css';
import './churvox-fresh/optionFModernEasy.css';
import './churvox-fresh/optionFTopNav.css';
import './churvox-fresh/optionFSearchTidy.css';
import './churvox-fresh/optionFIndustrialHeaders.css';
import './churvox-fresh/optionFNoCommandPill.css';
import './churvox-fresh/optionFHeaderPattern.css';
import './churvox-fresh/optionFGreyScrollbars.css';
import './churvox-fresh/optionFCenteredRecordModal.css';
import './churvox-fresh/optionFProblemSlipRuntime.css';
import './churvox-fresh/optionFFinalPagePolish.css';
import './churvox-fresh/optionFWorkspaceTighten.css';
import './churvox-fresh/optionFControlPages.css';
import './churvox-fresh/optionFControlPagesRuntime';
import './churvox-fresh/optionFControlPagesRuntimeGuard';
import './churvox-fresh/optionFPlansLiveCheckoutRuntimeV2';
import './churvox-fresh/optionFPlansIsolationRuntime';
import './churvox-fresh/optionFStripeManagedPriceDisplayRuntime';
import './churvox-fresh/optionFPlansUsageRuntime';
import './churvox-fresh/optionFBackendSyncRuntime';
import './churvox-fresh/optionFImportExportRuntime';
import './churvox-fresh/optionFXeroActionsRuntime';
import './churvox-fresh/optionFOperationsRuntime';
import './churvox-fresh/optionFAdminBrainRuntime';
import './churvox-fresh/optionFNoLeakRuntime';
import './churvox-fresh/optionFHideSeedDemoRuntime';
import './churvox-fresh/optionFPlainLanguageRuntime';
import './churvox-fresh/optionFWorkerCopyScrubRuntime';
import './churvox-fresh/optionFHideHelperButtonsRuntime';
import './churvox-fresh/optionFCommandCleanupRuntime';
import './churvox-fresh/optionFTodayScheduleGuardRuntime';
import './churvox-fresh/optionFAutoAdminFlowRuntime';
import './churvox-fresh/optionFDecisionEffectsRuntime';
import './churvox-fresh/optionFRecordHydrationRuntime';
import './churvox-fresh/optionFAiFillMissingRuntime';
import './churvox-fresh/optionFDrawerPersistenceRuntime';
import './churvox-fresh/optionFRealReviewFeatureRuntime.css';
import './churvox-fresh/optionFRealReviewBackendSyncRuntime.css';
import './churvox-fresh/optionFReadinessActionFixRuntime';
import './churvox-fresh/optionFApprovalExecutionRuntime';
import './churvox-fresh/optionFInvoiceVaultRuntime.css';
import './styles/churvoxResponsiveFit.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <RecordWorkspacePopupBridgeV2 />
  </React.StrictMode>
);
