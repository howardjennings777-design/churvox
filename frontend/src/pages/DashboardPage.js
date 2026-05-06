import React from "react";
import SmartHubPage from "./SmartHubPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <SmartHubPage />
    </SmartHubErrorBoundary>
  );
}
