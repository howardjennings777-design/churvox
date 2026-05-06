import React from "react";
import SmartHubTopPlayerFinal from "./SmartHubTopPlayerFinal";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <SmartHubTopPlayerFinal />
    </SmartHubErrorBoundary>
  );
}
