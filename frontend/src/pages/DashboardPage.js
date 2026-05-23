import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import JobToCashCommandBoard from "./JobToCashCommandBoard";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <JobToCashCommandBoard />
    </SmartHubErrorBoundary>
  );
}
