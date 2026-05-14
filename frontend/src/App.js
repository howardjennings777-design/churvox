import ChurvoxAIShell from "./shell/ChurvoxAIShell";
import ChurvoxErrorBoundary from "./shell/ChurvoxErrorBoundary";
import AIActionDock from "./shell/AIActionDock";

export default function App() {
  return (
    <>
      <ChurvoxAIShell />
      <AIActionDock />
    </>
  );
}
