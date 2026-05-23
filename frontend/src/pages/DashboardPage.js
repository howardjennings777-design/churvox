import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import OperatorDeskV2 from "./OperatorDeskV2";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <OperatorDeskV2 />
    </SmartHubErrorBoundary>
  );
}
