import React from "react";
import ProductAppV2 from "./ProductAppV2";
import WorldAdminLedger from "./WorldAdminLedger";
import WorldAdminLedgerNavBridge from "./WorldAdminLedgerNavBridge";
import { useApi } from "../hooks/useApi";

function LeastAdminAutoScan() {
  const api = useApi();
  const scanStateRef = React.useRef({ running: false, lastRun: 0 });

  React.useEffect(() => {
    let cancelled = false;

    async function callFirstWorking(paths) {
      let lastError = null;
      for (const [method, path] of paths) {
        try {
          return method === "post" ? await api.post(path, {}) : await api.get(path);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error("Auto-smart scan could not run");
    }

    async function runScan(force = false) {
      const now = Date.now();
      const state = scanStateRef.current;
      if (state.running) return;
      if (!force && state.lastRun && now - state.lastRun < 4 * 60 * 1000) return;
      state.running = true;
      try {
        await callFirstWorking([
          ["post", "/smart-hub/auto-scan"],
          ["get", "/smart-hub/auto-scan"],
          ["get", "/ai-operator/command-snapshot"],
          ["get", "/ai/operator/today-plan"],
          ["post", "/smart-hub/scan"],
        ]);
        state.lastRun = Date.now();
        if (!cancelled) window.dispatchEvent(new Event("churvox:data-refresh"));
      } catch {
        // Lower-tier users, offline sessions, or older backends can ignore the scanner safely.
      } finally {
        state.running = false;
      }
    }

    const first = window.setTimeout(() => runScan(true), 900);
    const interval = window.setInterval(() => runScan(false), 5 * 60 * 1000);
    const onFocus = () => runScan(false);
    const onManual = () => runScan(true);
    window.addEventListener("focus", onFocus);
    window.addEventListener("churvox:least-admin-scan", onManual);
    window.addEventListener("churvox:command-refresh", onManual);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("churvox:least-admin-scan", onManual);
      window.removeEventListener("churvox:command-refresh", onManual);
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
