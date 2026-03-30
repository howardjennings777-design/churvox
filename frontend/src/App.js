import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

// Auth Pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// App Pages
import DashboardPage from "@/pages/DashboardPage";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientFormPage from "@/pages/clients/ClientFormPage";
import ClientDetailPage from "@/pages/clients/ClientDetailPage";
import JobsPage from "@/pages/jobs/JobsPage";
import JobFormPage from "@/pages/jobs/JobFormPage";
import JobDetailPage from "@/pages/jobs/JobDetailPage";
import QuotesPage from "@/pages/quotes/QuotesPage";
import QuoteFormPage from "@/pages/quotes/QuoteFormPage";
import QuoteDetailPage from "@/pages/quotes/QuoteDetailPage";
import InvoicesPage from "@/pages/invoices/InvoicesPage";
import InvoiceFormPage from "@/pages/invoices/InvoiceFormPage";
import InvoiceDetailPage from "@/pages/invoices/InvoiceDetailPage";
import PlansPage from "@/pages/PlansPage";
import SettingsPage from "@/pages/SettingsPage";

import "./App.css";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route Component (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      
      {/* Clients */}
      <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
      <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />

      {/* Jobs */}
      <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/jobs/new" element={<ProtectedRoute><JobFormPage /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/jobs/:id/edit" element={<ProtectedRoute><JobFormPage /></ProtectedRoute>} />

      {/* Calendar */}
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

      {/* Quotes */}
      <Route path="/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
      <Route path="/quotes/new" element={<ProtectedRoute><QuoteFormPage /></ProtectedRoute>} />
      <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetailPage /></ProtectedRoute>} />
      <Route path="/quotes/:id/edit" element={<ProtectedRoute><QuoteFormPage /></ProtectedRoute>} />

      {/* Invoices */}
      <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
      <Route path="/invoices/new" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />
      <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />

      {/* Plans & Settings */}
      <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
