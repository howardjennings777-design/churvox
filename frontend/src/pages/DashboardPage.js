import React from "react";
import SmartHubExactPage from "./SmartHubExactPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <SmartHubExactPage />
    </SmartHubErrorBoundary>
  );
}
