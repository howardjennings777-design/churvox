import React from "react";
import { useLocation } from "react-router-dom";
import { NoFussHelp, NoFussMe } from "./WorkerNoFuss";

export default function WorkerSafeSettingsRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/help") return <NoFussHelp />;
  return <NoFussMe />;
}
