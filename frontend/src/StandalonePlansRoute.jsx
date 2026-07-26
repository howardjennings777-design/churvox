import React from "react";
import { useAuth } from "./context/AuthContext";
import "./churvox-studio/studioIconBridge";
import ChurvoxStudioApp from "./churvox-studio/ChurvoxStudioApp";
import StudioReleaseBridge from "./churvox-studio/StudioReleaseBridge";
import StudioCleanupBridge from "./churvox-studio/StudioCleanupBridge";
import "./churvox-studio/studioPolish.css";
import "./churvox-studio/studioCleanup.css";

export default function StandalonePlansRoute() {
  const { user } = useAuth();

  React.useEffect(() => {
    const email = String(user?.email || "").trim();
    if (!email) return;
    try {
      window.localStorage.setItem("churvox:billing-email", email);
    } catch {}
  }, [user?.email]);

  return (
    <div className="cvStandalonePlansRoute" data-checkout-trace="plans-current-owner-shell-v2">
      <ChurvoxStudioApp />
      <StudioReleaseBridge />
      <StudioCleanupBridge />
    </div>
  );
}
