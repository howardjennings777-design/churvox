import React from "react";
import "./churvox-studio/studioIconBridge";
import ChurvoxStudioApp from "./churvox-studio/ChurvoxStudioApp";
import StudioReleaseBridge from "./churvox-studio/StudioReleaseBridge";
import StudioCleanupBridge from "./churvox-studio/StudioCleanupBridge";
import "./churvox-studio/studioPolish.css";
import "./churvox-studio/studioCleanup.css";

export default function StandalonePlansRoute() {
  return (
    <div className="cvStandalonePlansRoute" data-checkout-trace="plans-current-owner-shell-v1">
      <ChurvoxStudioApp />
      <StudioReleaseBridge />
      <StudioCleanupBridge />
    </div>
  );
}
