import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import ControlSurfaceDashboard from "./ControlSurfaceDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <ControlSurfaceDashboard />
    </SmartHubErrorBoundary>
  );
}
