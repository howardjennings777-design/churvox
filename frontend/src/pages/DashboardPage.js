import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import OperatorFloorDashboard from "./OperatorFloorDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <OperatorFloorDashboard />
    </SmartHubErrorBoundary>
  );
}
