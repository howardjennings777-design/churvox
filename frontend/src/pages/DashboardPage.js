import React from "react";
import SmartHubBrainPageStable from "./SmartHubBrainPageStable";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><SmartHubBrainPageStable /></SmartHubErrorBoundary>;
}
