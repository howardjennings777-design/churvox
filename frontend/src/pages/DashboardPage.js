import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import CommandTableWorkspace from "./CommandTableWorkspace";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <CommandTableWorkspace />
    </SmartHubErrorBoundary>
  );
}
