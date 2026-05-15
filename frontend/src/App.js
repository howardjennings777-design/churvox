import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import ChurvoxErrorBoundary from "./shell/ChurvoxErrorBoundary";
import AIActionDock from "./shell/AIActionDock";


function readDockToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function clearDockSession() {
  try {
    ["token", "authToken", "access_token", "churvox_user", "churvox_role", "churvox_email"].forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export default function App() {
  return (
    <ChurvoxErrorBoundary>
      <ChurvoxAIShell />
      <AIActionDock />
    </ChurvoxErrorBoundary>
  );
}