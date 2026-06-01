import './concept-c/churvoxLaunchRouteAliases';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './concept-c/conceptC.css';
import './concept-c/conceptCHybridWorkspace.css';
import './concept-c/conceptCCommandV34FinalPolish.css';
import './concept-c/conceptCCommandV37RemoveHeroLogo.css';
import './concept-c/conceptCCommandV38UsefulPolish.css';
import './concept-c/commandFloorActionHubBoxes.css';
import './concept-c/commandFloorBalancedLayout.css';
import './concept-c/commandFloorApprovalDesk.css';
import './concept-c/commandFloorWorkSlipClarity.css';
import './concept-c/commandFloorWorkSlipCleanOverride.css';
import './concept-c/commandFloorSlipScrollFix.css';
import './concept-c/commandFloorSlipRedesign.css';
import './concept-c/churvoxWorkSlipActionBarPolish.css';
import './concept-c/CommandFloorSlipForceTheme.css';
import './concept-c/CommandFloorSlipFinalFit.css';
import './concept-c/CommandRealPagesTheme.css';
import './concept-c/CommandRealPagesUsabilityFix.css';
import './concept-c/CommandRealPagesBadgeFix.css';
import './concept-c/CommandHideTopNav.css';
import './concept-c/CommandBusinessPulseBigger.css';
import './concept-c/CommandFloorClearActionFinal.css';
import './concept-c/ChurvoxCommandRoomAppTheme.css';
import './pages/PlansFullScreenFix.css';
import './pages/PlansSmsBuyPatch';
import './concept-c/churvoxTopTierRuntimePatch';
import './concept-c/churvoxWorkerOfflineRuntimePatch';
import './concept-c/churvoxActivePresetJobRuntimePatch';
import './concept-c/churvoxLaunchNavRuntimePatch';
import './concept-c/churvoxSafePlansNav';
import './concept-c/churvoxWorkSlipLinkedActionsBridge';
import './concept-c/churvoxInvoiceJobContextPatch';
import './concept-c/churvoxMoneyDeskLinkedJobFilterPatch';
import './concept-c/churvoxWorkSlipDispatchPatch';
import './concept-c/churvoxCommandFloorControlCopyPatch';
import './concept-c/churvoxSidebarLabelRuntimeFix';
import './workhorseLiveCheck';
import './renderDeployMarker';
import './deploy/guidedOperatorFloorDeployMarker';
import './deploy/commandFloorTestingDeployMarker';
import './deploy/commandFloorRuntimeMarkers';

// CHURVOX_DISABLE_STALE_SERVICE_WORKER_20260529
// Do not register the PWA service worker while launch UI is changing quickly.
// This prevents old cached index.html files from asking for deleted hashed bundles.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {});
  });
}

if ('caches' in window) {
  window.addEventListener('load', () => {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
