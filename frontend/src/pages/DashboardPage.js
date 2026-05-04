import React from "react";
import AIControlRoomPage from "./AIControlRoomPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/aiControlRoomForceV4.css";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIControlRoomPage />
    </SmartHubErrorBoundary>
  );
}
