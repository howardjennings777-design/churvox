import React from "react";
import AIControlRoomWiredPage from "./AIControlRoomWiredPage";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";
import "../styles/aiControlRoomForceV4.css";

export default function DashboardPage() {
  return <SmartHubErrorBoundary><AIControlRoomWiredPage /></SmartHubErrorBoundary>;
}
