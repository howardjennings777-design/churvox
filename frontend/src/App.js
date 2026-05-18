import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import OperatorAuthPage from "./pages/operator-auth/OperatorAuthPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChurvoxAIShell initialView="console" />} />
        <Route path="/plans" element={<ChurvoxAIShell initialView="plans" />} />
        <Route path="/legal" element={<ChurvoxAIShell initialView="legal" />} />
        <Route path="/privacy" element={<Navigate to="/legal" replace />} />
        <Route path="/terms" element={<Navigate to="/legal" replace />} />
        <Route path="/contact" element={<ChurvoxAIShell initialView="contact" />} />

        <Route path="/login" element={<OperatorAuthPage mode="login" />} />
        <Route path="/signup" element={<OperatorAuthPage mode="signup" />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route path="/dashboard" element={<ChurvoxAIShell initialView="console" authedMode />} />
        <Route path="/app" element={<ChurvoxAIShell initialView="console" authedMode />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
