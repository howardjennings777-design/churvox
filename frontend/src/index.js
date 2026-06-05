import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import AIOperatorSlipBoard from './components/AIOperatorSlipBoard';
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

function CommandPreparedSlips() {
  const [show, setShow] = React.useState(() => window.location.pathname === '/dashboard');
  React.useEffect(() => {
    const timer = window.setInterval(() => setShow(window.location.pathname === '/dashboard'), 800);
    return () => window.clearInterval(timer);
  }, []);
  if (!show) return null;
  return <div className="cv-command-prepared-slips"><AIOperatorSlipBoard /></div>;
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
    <CommandPreparedSlips />
    <RecordWorkspacePopupBridgeV2 />
  </React.StrictMode>
);
