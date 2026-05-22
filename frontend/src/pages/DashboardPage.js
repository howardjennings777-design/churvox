import React from "react";
import CommandOfficePage from "./CommandOfficePage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <CommandOfficePage />
    </SmartHubErrorBoundary>
  );
}
