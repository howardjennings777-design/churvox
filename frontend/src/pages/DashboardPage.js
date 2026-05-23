import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import MissionBoardDashboard from "./MissionBoardDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <MissionBoardDashboard />
    </SmartHubErrorBoundary>
  );
}
