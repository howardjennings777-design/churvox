import React, { useCallback, useState } from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import AIWiredDashboard from "./AIWiredDashboard";

const ACTION_REFRESH_LABELS = [
  "approve action",
  "reject",
  "approve visible",
  "ai running",
  "ai processing",
];

export default function DashboardPage() {
  const [operatorRefreshKey, setOperatorRefreshKey] = useState(0);

  const refreshOperatorAfterAction = useCallback((event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;

    const label = String(button.textContent || "").trim().toLowerCase();
    const isOperatorAction = ACTION_REFRESH_LABELS.some((text) => label.includes(text));
    if (!isOperatorAction) return;

    // CHURVOX_LAUNCH_OPERATOR_LANES_CLICK_REFRESH
    // Remount AIWiredDashboard after action mutations so lanes reload immediately
    // from the real backend action/job/invoice/snapshot endpoints.
    window.setTimeout(() => setOperatorRefreshKey((value) => value + 1), 900);
    window.setTimeout(() => setOperatorRefreshKey((value) => value + 1), 2200);
  }, []);

  return (
    <SmartHubErrorBoundary>
      <div onClickCapture={refreshOperatorAfterAction}>
        <AIWiredDashboard key={operatorRefreshKey} />
      </div>
    </SmartHubErrorBoundary>
  );
}
