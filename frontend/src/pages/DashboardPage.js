import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import BusinessBoardDashboard from "./BusinessBoardDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <BusinessBoardDashboard />
    </SmartHubErrorBoundary>
  );
}
