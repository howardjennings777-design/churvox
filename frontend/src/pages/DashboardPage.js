import React from "react";
import CommandHubRealPage from "./CommandHubRealPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/smartHubStableFix.css";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><CommandHubRealPage /></SmartHubErrorBoundary>;
}
