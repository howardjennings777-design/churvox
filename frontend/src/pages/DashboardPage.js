import React from "react";
import AIControlRoomCompletePage from "./AIControlRoomCompletePage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/aiControlRoomForceV4.css";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIControlRoomCompletePage />
    </SmartHubErrorBoundary>
  );
}
