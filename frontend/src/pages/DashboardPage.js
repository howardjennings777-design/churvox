import React from "react";
import CommandHubTopPlayerPage from "./CommandHubTopPlayerPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/smartHubStableFix.css";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><CommandHubTopPlayerPage /></SmartHubErrorBoundary>;
}
