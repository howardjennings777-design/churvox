import React from "react";
import NewFrontDeskPage from "./ExecutiveFrontDeskPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <NewFrontDeskPage />
    </SmartHubErrorBoundary>
  );
}
