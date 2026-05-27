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
import './concept-c/churvoxTopTierRuntimePatch';
import './concept-c/churvoxWorkerOfflineRuntimePatch';
import './workhorseLiveCheck';
import './renderDeployMarker';
import './deploy/guidedOperatorFloorDeployMarker';
import './deploy/commandFloorTestingDeployMarker';
import './deploy/commandFloorRuntimeMarkers';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
