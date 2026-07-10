import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";
import { isOfficeTeamPreviewRoute } from "./OfficeTeamLiveRows";

export const OFFICE_OVERVIEW_AREAS = [
  { area: "work", label: "Jobs", screen: "work", fallback: "Jobs and bookings" },
  { area: "clients", label: "Clients", screen: "clients", fallback: "Client memory" },
  { area: "messages", label: "Messages", screen: "messages", fallback: "Replies and updates" },
  { area: "invoices", label: "Invoices", screen: "invoices", fallback: "Drafts and payments" },
  { area: "staff", label: "Workers", screen: "worker", fallback: "Workers and timers" },
  { area: "quotes", label: "Quotes", screen: "quotes", fallback: "Follow-ups and approvals" },
];

export function useOfficeTeamOverview(options = {}) {
  const allowFallback = isOfficeTeamPreviewRoute() && options.allowFallback !== false;
  const [state, setState] = useState({ source: "loading", areas: [] });

  useEffect(() => {
    let mounted = true;
    setState({ source: "loading", areas: [] });

    Promise.all(
      OFFICE_OVERVIEW_AREAS.map(async (item) => {
        try {
          const result = await fetchOfficeTeamRows(item.area);
          const rows = Array.isArray(result?.rows) ? result.rows : [];
          return {
            ...item,
            count: rows.length,
            source: rows.length ? "live" : allowFallback ? "preview" : "empty",
            message: rows.length
              ? result?.message || "Live read-only"
              : allowFallback
                ? "Example preview records"
                : "No live records",
            top: rows[0]?.[1] || (allowFallback ? item.fallback : "No live records"),
            status: rows[0]?.[2] || (allowFallback ? "Example" : "Clear"),
          };
        } catch {
          return {
            ...item,
            count: 0,
            source: allowFallback ? "preview" : "error",
            message: allowFallback ? "Example preview records" : "Live check unavailable",
            top: allowFallback ? item.fallback : "Live data unavailable",
            status: allowFallback ? "Example" : "Unavailable",
          };
        }
      })
    ).then((areas) => {
      if (!mounted) return;
      const liveCount = areas.filter((item) => item.source === "live").length;
      const errorCount = areas.filter((item) => item.source === "error").length;
      setState({
        source: liveCount ? "live" : errorCount ? "error" : allowFallback ? "preview" : "empty",
        liveCount,
        errorCount,
        areas,
      });
    });

    return () => {
      mounted = false;
    };
  }, [allowFallback]);

  return useMemo(() => {
    const areas = state.areas.length ? state.areas : OFFICE_OVERVIEW_AREAS.map((item) => ({
      ...item,
      count: 0,
      source: allowFallback ? "preview" : state.source === "loading" ? "loading" : "empty",
      message: allowFallback ? "Example preview records" : state.source === "loading" ? "Checking live records" : "No live records",
      top: allowFallback ? item.fallback : state.source === "loading" ? "Checking live records" : "No live records",
      status: allowFallback ? "Example" : state.source === "loading" ? "Checking" : "Clear",
    }));

    return {
      ...state,
      areas,
      label: state.source === "live"
        ? `${state.liveCount} live areas loaded`
        : state.source === "error"
          ? "Some live areas are unavailable"
          : allowFallback
            ? "Example preview records"
            : state.source === "loading"
              ? "Checking live areas"
              : "Live areas clear",
    };
  }, [allowFallback, state]);
}
