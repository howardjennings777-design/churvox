import React from "react";
import AIControlRoomActionPage from "./AIControlRoomActionPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/aiControlRoomForceV4.css";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIControlRoomActionPage />
    </SmartHubErrorBoundary>
  );
}
