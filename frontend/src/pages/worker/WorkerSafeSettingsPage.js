import React from "react";
import { useLocation } from "react-router-dom";
import { SimpleHelp, SimpleMe } from "./WorkerSimplePages";

export default function WorkerSafeSettingsRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/help") return <SimpleHelp />;
  return <SimpleMe />;
}
