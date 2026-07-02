import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './pages/marketing/PublicAdminOS.css';
import './churvox-clean/ChurvoxModernPolish.css';
import './runtime/authInputVisibilityGuard';

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
