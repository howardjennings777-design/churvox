import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/jobs/JobsPage";
import JobFormPage from "./pages/jobs/JobFormPage";
import JobDetailPage from "./pages/jobs/JobDetailPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ClientFormPage from "./pages/clients/ClientFormPage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";
import QuotesPage from "./pages/quotes/QuotesPage";
import QuoteFormPage from "./pages/quotes/QuoteFormPage";
import QuoteDetailPage from "./pages/quotes/QuoteDetailPage";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import InvoiceFormPage from "./pages/invoices/InvoiceFormPage";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import SettingsPage from "./pages/SettingsPage";
import PlansPage from "./pages/PlansPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-churvox-bg flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-churvox-bg flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" /></div>;
  return user ? <Navigate to="/dashboard" /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/jobs" element={<PrivateRoute><JobsPage /></PrivateRoute>} />
          <Route path="/jobs/new" element={<PrivateRoute><JobFormPage /></PrivateRoute>} />
          <Route path="/jobs/:id" element={<PrivateRoute><JobDetailPage /></PrivateRoute>} />
          <Route path="/jobs/:id/edit" element={<PrivateRoute><JobFormPage /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
          <Route path="/clients/new" element={<PrivateRoute><ClientFormPage /></PrivateRoute>} />
          <Route path="/clients/:id" element={<PrivateRoute><ClientDetailPage /></PrivateRoute>} />
          <Route path="/clients/:id/edit" element={<PrivateRoute><ClientFormPage /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />
          <Route path="/quotes" element={<PrivateRoute><QuotesPage /></PrivateRoute>} />
          <Route path="/quotes/new" element={<PrivateRoute><QuoteFormPage /></PrivateRoute>} />
          <Route path="/quotes/:id" element={<PrivateRoute><QuoteDetailPage /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
          <Route path="/invoices/new" element={<PrivateRoute><InvoiceFormPage /></PrivateRoute>} />
          <Route path="/invoices/:id" element={<PrivateRoute><InvoiceDetailPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/plans" element={<PrivateRoute><PlansPage /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
