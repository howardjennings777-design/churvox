import React from "react";
import "../churvox-studio/studioIconBridge";
import ChurvoxStudioApp from "../churvox-studio/ChurvoxStudioApp";
import "../churvox-studio/studioPolish.css";
import "../churvox-studio/studioCleanup.css";

const StudioReleaseBridge = React.lazy(() => import("../churvox-studio/StudioReleaseBridge"));
const StudioCleanupBridge = React.lazy(() => import("../churvox-studio/StudioCleanupBridge"));
const GrowthToolsBridge = React.lazy(() => import("../churvox-studio/GrowthToolsBridge"));

function DeferredStudioBridges() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const show = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const idle = window.requestIdleCallback(show, { timeout: 800 });
      return () => window.cancelIdleCallback?.(idle);
    }
    const timer = window.setTimeout(show, 120);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return (
    <React.Suspense fallback={null}>
      <GrowthToolsBridge />
      <StudioReleaseBridge />
      <StudioCleanupBridge />
    </React.Suspense>
  );
}

export default function FreshApp() {
  if (typeof window !== "undefined" && String(window.location.hash || "").replace(/^#/, "").toLowerCase() === "plans") {
    window.location.replace("/plans");
    return null;
  }
  return <><ChurvoxStudioApp /><DeferredStudioBridges /></>;
}
