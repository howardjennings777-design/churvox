import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import SmartHubPage from './pages/SmartHubPage';
import ClientsPage from './pages/clients/ClientsPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import JobsPage from './pages/jobs/JobsPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import JobFormPage from './pages/jobs/JobFormPage';
import QuotesPage from './pages/quotes/QuotesPage';
import QuoteDetailPage from './pages/quotes/QuoteDetailPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import TeamPage from './pages/TeamPage';
import WorkerJobsPage from './pages/worker/WorkerJobsPage';
import WorkerJobDetailPage from './pages/worker/WorkerJobDetailPage';
import PayrollPage from './pages/PayrollPage';
import AutomationPage from './pages/AutomationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PlansPage from './pages/PlansPage';
import SMSPage from './pages/SMSPage';
import IntegrationsPage from './pages/IntegrationsPage';
import PublicQuotePage from './pages/public/PublicQuotePage';
import PublicInvoicePage from './pages/public/PublicInvoicePage';

const SAFE_HOME = '/smart-hub';
function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div />;
  return user ? children : <Navigate to='/login' replace />;
}
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div />;
  return user ? <Navigate to={SAFE_HOME} replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* CHURVOX_ROUTES_NO_EMPTY_PAGES */}
      <Route path='/login' element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path='/signup' element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path='/public/quote/:token' element={<PublicQuotePage />} />
      <Route path='/public/invoice/:token' element={<PublicInvoicePage />} />
      <Route path='/' element={<Navigate to={SAFE_HOME} replace />} />

      <Route element={<Guard><Layout /></Guard>}>
        <Route path='/smart-hub' element={<SmartHubPage />} />
        <Route path='/dashboard' element={<Navigate to='/smart-hub' replace />} />
        <Route path='/clients' element={<ClientsPage />} />
        <Route path='/clients/:id' element={<ClientDetailPage />} />
        <Route path='/jobs' element={<JobsPage />} />
        <Route path='/jobs/new' element={<JobFormPage />} />
        <Route path='/jobs/:id' element={<JobDetailPage />} />
        <Route path='/quotes' element={<QuotesPage />} />
        <Route path='/quotes/:id' element={<QuoteDetailPage />} />
        <Route path='/invoices' element={<InvoicesPage />} />
        <Route path='/invoices/:id' element={<InvoiceDetailPage />} />
        <Route path='/team' element={<TeamPage />} />
        <Route path='/worker/jobs' element={<WorkerJobsPage />} />
        <Route path='/worker/jobs/:id' element={<WorkerJobDetailPage />} />
        <Route path='/timesheets' element={<PayrollPage />} />
        <Route path='/automation' element={<AutomationPage />} />
        <Route path='/reports' element={<ReportsPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/plans' element={<PlansPage />} />
        <Route path='/sms' element={<SMSPage />} />
        <Route path='/integrations' element={<IntegrationsPage />} />
      </Route>

      <Route path='*' element={<Navigate to={SAFE_HOME} replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><BrowserRouter><Toaster richColors position='top-right' /><AppRoutes /></BrowserRouter></AuthProvider>;
}
