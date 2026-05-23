import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './styles/churvox-workhorse.css';
import './styles/churvox-workhorse-worker.css';
import './styles/churvox-workhorse-worker-complete.css';
import './styles/churvox-workhorse-ops.css';
import './styles/aiDashPolish.css';
import './styles/churvoxControlSurfaceApp.css';
import './styles/churvoxForceControlSurface.css';
import './styles/churvoxDeepOperationsTheme.css';
import './styles/churvoxBusinessBoardTheme.css';
import './workhorseLiveCheck';
import './renderDeployMarker';
import './deploy/guidedOperatorFloorDeployMarker';

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