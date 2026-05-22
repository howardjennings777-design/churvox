import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import AIWiredDashboard from "./AIWiredDashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIWiredDashboard />
    </SmartHubErrorBoundary>
  );
}
