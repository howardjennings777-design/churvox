import "../churvox-studio/studioIconBridge";
import ChurvoxStudioApp from "../churvox-studio/ChurvoxStudioApp";
import StudioReleaseBridge from "../churvox-studio/StudioReleaseBridge";
import StudioCleanupBridge from "../churvox-studio/StudioCleanupBridge";
import GrowthToolsBridge from "../churvox-studio/GrowthToolsBridge";
import "../churvox-studio/studioPolish.css";
import "../churvox-studio/studioCleanup.css";

export default function FreshApp() {
  if (typeof window !== "undefined" && String(window.location.hash || "").replace(/^#/, "").toLowerCase() === "plans") {
    window.location.replace("/plans");
    return null;
  }
  return <><ChurvoxStudioApp /><GrowthToolsBridge /><StudioReleaseBridge /><StudioCleanupBridge /></>;
}
