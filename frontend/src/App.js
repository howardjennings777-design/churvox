import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import AppShell from './newApp/components/AppShell';
import LoginPage from './newApp/pages/LoginPage';
import SignupPage from './newApp/pages/SignupPage';
import SmartHubPage from './newApp/pages/SmartHubPage';
import ClientsPage from './newApp/pages/ClientsPage';
import ClientDetailPage from './newApp/pages/ClientDetailPage';
import JobsPage from './newApp/pages/JobsPage';
import JobDetailPage from './newApp/pages/JobDetailPage';
import JobFormPage from './newApp/pages/JobFormPage';
import QuotesPage from './newApp/pages/QuotesPage';
import QuoteDetailPage from './newApp/pages/QuoteDetailPage';
import InvoicesPage from './newApp/pages/InvoicesPage';
import InvoiceDetailPage from './newApp/pages/InvoiceDetailPage';
import TeamPage from './newApp/pages/TeamPage';
import WorkerDashboardPage from './newApp/pages/WorkerDashboardPage';
import WorkerJobDetailPage from './newApp/pages/WorkerJobDetailPage';
import PayrollPage from './newApp/pages/PayrollPage';
import AutomationPage from './newApp/pages/AutomationPage';
import ReportsPage from './newApp/pages/ReportsPage';
import SettingsPage from './newApp/pages/SettingsPage';
import PlansPage from './newApp/pages/PlansPage';
import CommunicationsPage from './newApp/pages/CommunicationsPage';
import IntegrationsPage from './newApp/pages/IntegrationsPage';
import PublicQuotePage from './pages/public/PublicQuotePage';
import PublicInvoicePage from './pages/public/PublicInvoicePage';

const SAFE_HOME='/smart-hub';
function Guard({children}){const {user,loading}=useAuth(); if(loading)return <div/>; return user?children:<Navigate to='/login' replace/>}
function PublicRoute({children}){const {user,loading}=useAuth(); if(loading)return <div/>; return user?<Navigate to={SAFE_HOME} replace/>:children}
function AppRoutes(){return <Routes>
  {/* CHURVOX_NEW_FRONTEND_ACTIVE_ROUTES */}
  <Route path='/login' element={<PublicRoute><LoginPage/></PublicRoute>} />
  <Route path='/signup' element={<PublicRoute><SignupPage/></PublicRoute>} />
  <Route path='/public/quote/:token' element={<PublicQuotePage/>} />
  <Route path='/public/invoice/:token' element={<PublicInvoicePage/>} />
  <Route path='/' element={<Navigate to={SAFE_HOME} replace/>} />
  <Route element={<Guard><AppShell/></Guard>}>
    <Route path='/smart-hub' element={<SmartHubPage/>} />
    <Route path='/dashboard' element={<Navigate to='/smart-hub' replace/>} />
    <Route path='/clients' element={<ClientsPage/>} />
    <Route path='/clients/:id' element={<ClientDetailPage/>} />
    <Route path='/jobs' element={<JobsPage/>} />
    <Route path='/jobs/new' element={<JobFormPage/>} />
    <Route path='/jobs/:id' element={<JobDetailPage/>} />
    <Route path='/quotes' element={<QuotesPage/>} />
    <Route path='/quotes/:id' element={<QuoteDetailPage/>} />
    <Route path='/invoices' element={<InvoicesPage/>} />
    <Route path='/invoices/:id' element={<InvoiceDetailPage/>} />
    <Route path='/team' element={<TeamPage/>} />
    <Route path='/worker/jobs' element={<WorkerDashboardPage/>} />
    <Route path='/worker/jobs/:id' element={<WorkerJobDetailPage/>} />
    <Route path='/timesheets' element={<PayrollPage/>} />
    <Route path='/automation' element={<AutomationPage/>} />
    <Route path='/reports' element={<ReportsPage/>} />
    <Route path='/settings' element={<SettingsPage/>} />
    <Route path='/plans' element={<PlansPage/>} />
    <Route path='/sms' element={<CommunicationsPage/>} />
    <Route path='/integrations' element={<IntegrationsPage/>} />
  </Route>
  <Route path='*' element={<Navigate to={SAFE_HOME} replace/>} />
</Routes>}

export default function App(){return <AuthProvider><BrowserRouter><Toaster richColors position='top-right'/><AppRoutes/></BrowserRouter></AuthProvider>}
