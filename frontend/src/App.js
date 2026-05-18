import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import ChurvoxFullApp from "./ChurvoxFullApp";

const FULL_APP_OWNS_ROUTER = true;

function cleanPath(pathname) {
  const clean = String(pathname || "/").replace(/\/+$/, "");
  return clean || "/";
}

function PublicOperatorWebsite() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChurvoxAIShell initialView="console" />} />
        <Route path="/plans" element={<ChurvoxAIShell initialView="plans" />} />
        <Route path="/legal" element={<ChurvoxAIShell initialView="legal" />} />
        <Route path="/privacy" element={<Navigate to="/legal" replace />} />
        <Route path="/terms" element={<Navigate to="/legal" replace />} />
        <Route path="/contact" element={<ChurvoxAIShell initialView="contact" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const path = cleanPath(window.location.pathname);

  const publicWebsitePaths = new Set([
    "/",
    "/plans",
    "/legal",
    "/privacy",
    "/terms",
    "/contact",
  ]);

  if (publicWebsitePaths.has(path)) {
    return <PublicOperatorWebsite />;
  }

  if (FULL_APP_OWNS_ROUTER) {
    return <ChurvoxFullApp />;
  }

  return (
    <BrowserRouter>
      <ChurvoxFullApp />
    </BrowserRouter>
  );
}
