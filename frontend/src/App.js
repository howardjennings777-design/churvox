import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import ChurvoxErrorBoundary from "./shell/ChurvoxErrorBoundary";

export default function App() {
  return (
    <ChurvoxErrorBoundary>
      <ChurvoxAIShell />
    </ChurvoxErrorBoundary>
  );
}
