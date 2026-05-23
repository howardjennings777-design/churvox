import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import BusinessBoardV2Dashboard from "./BusinessBoardV2Dashboard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <BusinessBoardV2Dashboard />
    </SmartHubErrorBoundary>
  );
}
