import React from "react";
import { useLocation } from "react-router-dom";
import { WorkerTodayPage, WorkerJobsPage as RebuiltWorkerJobsPage } from "./WorkerRebuildPages";

export default function WorkerJobsRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/today" || location.pathname === "/worker") return <WorkerTodayPage />;
  return <RebuiltWorkerJobsPage />;
}
