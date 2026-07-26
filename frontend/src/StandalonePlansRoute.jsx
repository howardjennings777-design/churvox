import React from "react";
import FreshPlans from "./churvox-fresh/FreshPlans";

export default function StandalonePlansRoute() {
  const handleNavigate = React.useCallback((target) => {
    const section = String(target || "").trim().toLowerCase();
    if (section === "support" || section === "help") {
      window.location.assign("/support");
      return;
    }
    window.location.assign(section ? `/dashboard#${section}` : "/dashboard");
  }, []);

  return (
    <main className="cvStandalonePlansRoute" data-checkout-trace="plans-route-auth-recover-v1">
      <FreshPlans onNavigate={handleNavigate} />
    </main>
  );
}
