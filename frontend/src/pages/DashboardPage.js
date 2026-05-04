import React from "react";
import SmartHubBrainPageStable from "./SmartHubBrainPageStable";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/smartHubStableFix.css";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><SmartHubBrainPageStable /></SmartHubErrorBoundary>;
}
