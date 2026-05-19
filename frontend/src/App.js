import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import OperatorAuthPage from "./pages/operator-auth/OperatorAuthPage";
import ChurvoxFullApp from "./ChurvoxFullApp";

function cleanPath(pathname) {
  const clean = String(pathname || "/").replace(/\/+$/, "");
  return clean || "/";
}

function PublicNexusRoutes() {
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
        <Route path="/login" element={<OperatorAuthPage mode="login" />} />
        <Route path="/signup" element={<OperatorAuthPage mode="signup" />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const path = cleanPath(window.location.pathname);

  const publicPaths = new Set([
    "/",
    "/how-it-works",
    "/features",
    "/plans",
    "/legal",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
    "/login",
    "/signup",
    "/register",
  ]);

  if (publicPaths.has(path)) {
    return <PublicNexusRoutes />;
  }

  return <ChurvoxFullApp />;
}
