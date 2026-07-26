import React from "react";
import FreshPlans from "./churvox-fresh/FreshPlans";
import FreshShell from "./churvox-fresh/FreshShell";

const PLAN_NAV_ALIASES = Object.freeze({
  dashboard: "planday",
  today: "planday",
  smart: "planday",
  support: "support",
  help: "support",
});

export default function StandalonePlansRoute() {
  const handleNavigate = React.useCallback((target) => {
    const requested = String(target || "").trim().toLowerCase();
    if (!requested || requested === "plans") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const section = PLAN_NAV_ALIASES[requested] || requested;
    window.location.assign(`/dashboard#${encodeURIComponent(section)}`);
  }, []);

  return (
    <FreshShell active="plans" onChange={handleNavigate}>
      <main className="cvStandalonePlansRoute" data-checkout-trace="plans-route-live-shell-v2">
        <FreshPlans onNavigate={handleNavigate} />
      </main>
    </FreshShell>
  );
}
