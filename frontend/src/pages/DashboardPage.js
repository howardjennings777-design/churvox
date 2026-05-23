import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import WorkbenchDashboard from "./WorkbenchDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <WorkbenchDashboard />
    </SmartHubErrorBoundary>
  );
}
