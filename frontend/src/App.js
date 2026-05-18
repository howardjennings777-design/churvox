import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import OperatorAuthPage from "./pages/operator-auth/OperatorAuthPage";

function DashboardEntry() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("churvox_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <ChurvoxAIShell initialView="console" authedMode />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChurvoxAIShell initialView="console" />} />
        <Route path="/plans" element={<ChurvoxAIShell initialView="plans" />} />
        <Route path="/legal" element={<ChurvoxAIShell initialView="legal" />} />
        <Route path="/contact" element={<ChurvoxAIShell initialView="contact" />} />

        <Route path="/login" element={<OperatorAuthPage mode="login" />} />
        <Route path="/signup" element={<OperatorAuthPage mode="signup" />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route path="/dashboard" element={<DashboardEntry />} />
        <Route path="/app" element={<DashboardEntry />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
