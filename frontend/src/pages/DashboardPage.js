import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import FlowlineCommandCentre from "./FlowlineCommandCentre";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <FlowlineCommandCentre />
    </SmartHubErrorBoundary>
  );
}
