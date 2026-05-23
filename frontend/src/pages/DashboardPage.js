import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import DispatchCommandCentre from "./DispatchCommandCentre";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <DispatchCommandCentre />
    </SmartHubErrorBoundary>
  );
}
