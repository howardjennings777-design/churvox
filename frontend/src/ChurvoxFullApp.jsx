import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/jobs/JobsPage";
import ClientsPage from "./pages/clients/ClientsPage";
import QuotesPage from "./pages/quotes/QuotesPage";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import TeamPage from "./pages/TeamPage";

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070d", color: "#f8fbff" }}>
      Opening Churvox...
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default function ChurvoxFullApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/jobs" element={<PrivateRoute><JobsPage /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
          <Route path="/quotes" element={<PrivateRoute><QuotesPage /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
