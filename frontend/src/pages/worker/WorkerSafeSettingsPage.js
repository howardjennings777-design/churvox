import React from "react";
import { useLocation } from "react-router-dom";
import { DailyHelp, DailyMe } from "./WorkerDailySimple";

export default function WorkerSafeSettingsRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/help") return <DailyHelp />;
  return <DailyMe />;
}
