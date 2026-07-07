import React from "react";
import ProductAppV2 from "./ProductAppV2";
import WorldAdminLedger from "./WorldAdminLedger";
import WorldAdminLedgerNavBridge from "./WorldAdminLedgerNavBridge";
import { useApi } from "../hooks/useApi";

function LeastAdminAutoScan() {
  const api = useApi();
  const scanStartedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;

    async function runScan() {
      if (scanStartedRef.current) return;
      scanStartedRef.current = true;
      try {
        await api.get("/ai/operator/today-plan");
        if (!cancelled) window.dispatchEvent(new Event("churvox:data-refresh"));
      } catch (error) {
        try {
          await api.post("/smart-hub/scan", {});
          if (!cancelled) window.dispatchEvent(new Event("churvox:data-refresh"));
        } catch {
          // Lower-tier users or older backends can ignore the clever scan safely.
        }
      }
    }

    const timer = window.setTimeout(runScan, 900);
    window.addEventListener("churvox:least-admin-scan", runScan);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("churvox:least-admin-scan", runScan);
    };
  }, [api]);

  return null;
}

export default function ProductAppV2WithLedger() {
  return <>
    <LeastAdminAutoScan />
    <ProductAppV2 />
    <WorldAdminLedger />
    <WorldAdminLedgerNavBridge />
  </>;
}
