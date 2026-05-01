import { Outlet } from 'react-router-dom';
import ModernSidebar from './ModernSidebar';
import ModernTopbar from './ModernTopbar';

// CHURVOX_MODERN_WEBSITE_ACTIVE_SHELL
export default function ModernShell() {
  return (
    <div className="modern-shell">
      <ModernSidebar />
      <main className="modern-main">
        <ModernTopbar />
        <Outlet />
      </main>
    </div>
  );
}
