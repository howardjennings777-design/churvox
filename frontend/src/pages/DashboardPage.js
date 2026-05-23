import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import GuidedOperatorFloor from "./GuidedOperatorFloor";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <GuidedOperatorFloor />
    </SmartHubErrorBoundary>
  );
}
