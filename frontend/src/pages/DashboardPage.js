import React from "react";
import AIControlRoomLaunchPage from "./AIControlRoomLaunchPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/aiControlRoomForceV4.css";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIControlRoomLaunchPage />
    </SmartHubErrorBoundary>
  );
}
