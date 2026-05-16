import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import ChurvoxErrorBoundary from "./shell/ChurvoxErrorBoundary";
import PublicCustomerCommandPage from "./customer-command/PublicCustomerCommandPage";

export default function App() {
  const path = window.location.pathname || "";

  if (path.startsWith("/customer-command/")) {
    return (
      <ChurvoxErrorBoundary>
        <PublicCustomerCommandPage />
      </ChurvoxErrorBoundary>
    );
  }

  return (
    <ChurvoxErrorBoundary>
      <ChurvoxAIShell />
    </ChurvoxErrorBoundary>
  );
}
