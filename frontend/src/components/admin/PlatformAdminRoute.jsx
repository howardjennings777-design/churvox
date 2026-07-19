import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const LEGACY_OWNER_EMAILS = new Set([
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);

function emailOf(user = {}) {
  return String(user?.email || user?.user_email || user?.owner_email || "").trim().toLowerCase();
}

function clearLegacyOwnerSession() {
  try {
    [
      "token",
      "authToken",
      "access_token",
      "owner_portal_session",
      "platform_owner_email",
      "churvox_auth_session_snapshot_v1",
    ].forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch {}
}

export default function PlatformAdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const userEmail = emailOf(user);
  const legacyOwnerSession = LEGACY_OWNER_EMAILS.has(userEmail);

  React.useEffect(() => {
    if (loading || !legacyOwnerSession) return;
    clearLegacyOwnerSession();
    const next = encodeURIComponent(location.pathname || "/admin");
    window.location.replace(`/login?next=${next}&owner=hello`);
  }, [legacyOwnerSession, loading, location.pathname]);

  if (loading || legacyOwnerSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        {legacyOwnerSession ? "Refreshing the hello@churvox.com HQ session..." : "Loading admin access..."}
      </div>
    );
  }

  // The backend HQ guard is intentionally hello-only. Keeping the frontend
  // gate identical prevents an old owner alias from opening an HQ shell whose
  // data requests are all rejected with 403 responses.
  if (userEmail !== PLATFORM_OWNER_EMAIL) {
    return <Navigate to="/login?next=%2Fadmin&owner=hello" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}
