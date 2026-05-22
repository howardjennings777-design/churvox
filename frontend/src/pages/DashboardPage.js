import React, { useCallback, useEffect, useRef, useState } from "react";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import AIWiredDashboard from "./AIWiredDashboard";

const ACTION_REFRESH_LABELS = ["approve", "reject", "run"];

export default function DashboardPage() {
  const [operatorRefreshKey, setOperatorRefreshKey] = useState(0);
  const refreshUntilRef = useRef(0);

  const refreshOperator = useCallback(() => {
    setOperatorRefreshKey((value) => value + 1);
  }, []);

  const refreshOperatorAfterAction = useCallback((event) => {
    const button = event.target?.closest?.("button");
    if (!button || !button.closest?.(".wh-ai-operator")) return;

    const label = String(button.textContent || "").trim().toLowerCase();
    if (!ACTION_REFRESH_LABELS.some((text) => label.includes(text))) return;

    refreshUntilRef.current = Date.now() + 9000;
    window.setTimeout(refreshOperator, 500);
    window.setTimeout(refreshOperator, 1200);
    window.setTimeout(refreshOperator, 2500);
  }, [refreshOperator]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() < refreshUntilRef.current) refreshOperator();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refreshOperator]);

  return (
    <SmartHubErrorBoundary>
      <div onClickCapture={refreshOperatorAfterAction}>
        <AIWiredDashboard key={operatorRefreshKey} />
      </div>
    </SmartHubErrorBoundary>
  );
}
