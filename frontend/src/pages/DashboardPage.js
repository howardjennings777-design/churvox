import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import CommandDeskWorkspace from "./CommandDeskWorkspace";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <CommandDeskWorkspace />
    </SmartHubErrorBoundary>
  );
}
