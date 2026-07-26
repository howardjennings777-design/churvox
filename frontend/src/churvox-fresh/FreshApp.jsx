import "../churvox-studio/studioIconBridge";
import ChurvoxStudioApp from "../churvox-studio/ChurvoxStudioApp";
import StudioReleaseBridge from "../churvox-studio/StudioReleaseBridge";
import StudioCleanupBridge from "../churvox-studio/StudioCleanupBridge";
import "../churvox-studio/studioPolish.css";
import "../churvox-studio/studioCleanup.css";

export default function FreshApp() {
  return <><ChurvoxStudioApp /><StudioReleaseBridge /><StudioCleanupBridge /></>;
}
