import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './components/recordWorkspacePopup.css';
import './concept-c/LoggedInLightBackgroundOverride.css';
import './industrial-command-global.css';
import './public-industrial-theme.css';
import './background-only-force.css';
import './command-force-dark-boxes.css';
import './command-money-under-header.css';
import './runtime/churvoxClearOldCache';
import './runtime/churvoxSlipOnlyMode';
import './styles/jobs-board-clean-polish.css';
import './styles/dispatch-board-clean-polish.css';
import './styles/clients-board-clean-polish.css';
import './styles/quotes-board-clean-polish.css';
import './styles/churvox-clean-system.css';
import './runtime/churvoxContrastGuard';
import './styles/sidebar-final-authority.css';

// CHURVOX_JOBS_BOARD_ROUTE_CLASS_20260609
if (typeof window !== 'undefined' && !window.__CHURVOX_JOBS_BOARD_ROUTE_CLASS__) {
  window.__CHURVOX_JOBS_BOARD_ROUTE_CLASS__ = true;

  const syncJobsBoardClass = () => {
    const path = window.location.pathname || '';
    const onJobsBoard = path === '/jobs' || path === '/jobs-board' || path.startsWith('/jobs/');
    const onQuotesBoard = path === '/quotes-board' || path === '/quotes' || path.startsWith('/quotes/');
    const onClientsBoard = path === '/clients-board' || path === '/clients' || path.startsWith('/clients/');
    const onDispatchBoard = path === '/dispatch-board' || path === '/dispatch' || path.startsWith('/dispatch/');
    document.body.classList.toggle('cv-route-jobs-board', onJobsBoard);
    document.body.classList.toggle('cv-route-quotes-board', onQuotesBoard);
    document.body.classList.toggle('cv-route-clients-board', onClientsBoard);
    document.body.classList.toggle('cv-route-dispatch-board', onDispatchBoard);

    if (onJobsBoard) {
      document.querySelectorAll('body *').forEach((node) => {
        if (node.children && node.children.length) return;
        const text = (node.textContent || '').trim();
        if (/^BUILD\s+DIRECT-WORKBENCH/i.test(text)) {
          node.style.display = 'none';
          node.setAttribute('aria-hidden', 'true');
        }
      });
    }
  };

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStatePatched(...args) {
    const result = originalPushState.apply(this, args);
    setTimeout(syncJobsBoardClass, 0);
    return result;
  };

  window.history.replaceState = function replaceStatePatched(...args) {
    const result = originalReplaceState.apply(this, args);
    setTimeout(syncJobsBoardClass, 0);
    return result;
  };

  window.addEventListener('popstate', syncJobsBoardClass);
  window.addEventListener('load', syncJobsBoardClass);
  document.addEventListener('click', () => setTimeout(syncJobsBoardClass, 80), true);

  const observer = new MutationObserver(() => syncJobsBoardClass());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  syncJobsBoardClass();
}


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


