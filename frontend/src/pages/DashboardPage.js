import React from "react";
import CommandHubPage from "./CommandHubPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/smartHubStableFix.css";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><CommandHubPage /></SmartHubErrorBoundary>;
}
