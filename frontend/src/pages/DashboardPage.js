import React from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import TradeCommandConsole from "./TradeCommandConsole";

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <TradeCommandConsole />
    </SmartHubErrorBoundary>
  );
}
