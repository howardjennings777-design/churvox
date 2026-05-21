import React from "react";
import FrontDeskPage from "./FrontDeskPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <FrontDeskPage />
    </SmartHubErrorBoundary>
  );
}
