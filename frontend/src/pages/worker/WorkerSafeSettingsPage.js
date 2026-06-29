import React from "react";
import { useLocation } from "react-router-dom";
import { WorkerHelpPage, WorkerMePage } from "./WorkerRebuildPages";

export default function WorkerSafeSettingsRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/help") return <WorkerHelpPage />;
  return <WorkerMePage />;
}
