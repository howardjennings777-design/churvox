import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import WorkBoardCommandWall from "./WorkBoardCommandWall";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <WorkBoardCommandWall />
    </SmartHubErrorBoundary>
  );
}
