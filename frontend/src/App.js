import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import OperatorAuthPage from "./pages/operator-auth/OperatorAuthPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChurvoxAIShell />} />
        <Route path="/how-it-works" element={<ChurvoxAIShell />} />
        <Route path="/features" element={<ChurvoxAIShell />} />
        <Route path="/plans" element={<ChurvoxAIShell />} />
        <Route path="/legal" element={<ChurvoxAIShell />} />
        <Route path="/contact" element={<ChurvoxAIShell />} />

        <Route path="/privacy" element={<Navigate to="/legal" replace />} />
        <Route path="/terms" element={<Navigate to="/legal" replace />} />
        <Route path="/refunds" element={<Navigate to="/legal" replace />} />
        <Route path="/security" element={<Navigate to="/legal" replace />} />

        <Route path="/login" element={<OperatorAuthPage mode="login" />} />
        <Route path="/signup" element={<OperatorAuthPage mode="signup" />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route path="/dashboard" element={<ChurvoxAIShell authedMode />} />
        <Route path="/app" element={<ChurvoxAIShell authedMode />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
