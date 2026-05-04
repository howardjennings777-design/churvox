import React from "react";
import AIControlRoomPage from "./AIControlRoomPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <AIControlRoomPage />
    </SmartHubErrorBoundary>
  );
}
