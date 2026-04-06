import React from "react";
import { Navigate } from "react-router-dom";

export default function PlatformAdminRoute({ children }) {
  let rawUser = null;

  try {
    rawUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");
  } catch (e) {
    rawUser = null;
  }

  let user = null;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    user = null;
  }

  const email = String(
    user?.email ||
    user?.user?.email ||
    ""
  ).toLowerCase();

  const role = String(
    user?.role ||
    user?.user?.role ||
    ""
  ).toLowerCase();

  const allowedEmails = [
    "hello@churvox.com"
  ];

  const isAllowed =
    role === "admin" ||
    role === "super_admin" ||
    role === "superadmin" ||
    allowedEmails.includes(email);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
