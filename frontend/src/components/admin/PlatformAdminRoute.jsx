import React from "react";
import { Navigate } from "react-router-dom";

function getOwnerSession() {
  try {
    return JSON.parse(localStorage.getItem("owner_portal_session") || "null");
  } catch {
    return null;
  }
}

export default function PlatformAdminRoute({ children }) {
  const session = getOwnerSession();

  if (!session?.is_owner) {
    return <Navigate to="/owner/login" replace />;
  }

  return children;
}
