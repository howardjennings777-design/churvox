import React from "react";
import SmartHubBrainPage from "./SmartHubBrainPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><SmartHubBrainPage /></SmartHubErrorBoundary>;
}
