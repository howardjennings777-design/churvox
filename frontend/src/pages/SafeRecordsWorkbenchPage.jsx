import LaunchReadyWorkbenchPage from "./LaunchReadyWorkbenchPage";

export default function SafeRecordsWorkbenchPage({ type = "clients" }) {
  return <LaunchReadyWorkbenchPage area={type} />;
}
