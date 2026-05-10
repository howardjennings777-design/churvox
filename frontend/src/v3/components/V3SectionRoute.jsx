import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccess, getDefaultRoute } from "../../lib/roles";
import V3WorkspacePage from "../pages/V3WorkspacePage";

const SECTION_ROUTE_KEY = {
  decisions: "ai_operator",
  jobs: "jobs",
  dispatch: "calendar",
  clients: "clients",
  quotes: "quotes",
  invoices: "invoices",
  team: "team",
  payroll: "payroll",
  rules: "ai_operator",
  reports: "reports",
  messages: "sms",
  integrations: "integrations",
  plans: "plans",
  settings: "settings",
  proof: "proof_to_paid",
};

export default function V3SectionRoute() {
  const { section = "" } = useParams();
  const { normalizedRole } = useAuth();

  const cleanSection = String(section || "").toLowerCase();
  const routeKey = SECTION_ROUTE_KEY[cleanSection];

  if (!routeKey) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccess(normalizedRole, routeKey)) {
    return <Navigate to={getDefaultRoute(normalizedRole)} replace />;
  }

  return <V3WorkspacePage />;
}
