import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";

export const OFFICE_OVERVIEW_AREAS = [
  { area: "work", label: "Jobs", screen: "work", fallback: "Jobs and bookings" },
  { area: "clients", label: "Clients", screen: "clients", fallback: "Client memory" },
  { area: "messages", label: "Messages", screen: "messages", fallback: "Replies and updates" },
  { area: "invoices", label: "Invoices", screen: "invoices", fallback: "Drafts and payments" },
  { area: "staff", label: "Workers", screen: "worker", fallback: "Workers and timers" },
  { area: "quotes", label: "Quotes", screen: "quotes", fallback: "Follow-ups and approvals" },
];

export function useOfficeTeamOverview(options = {}) {
  const allowFallback = options.allowFallback !== false;
  const [state, setState] = useState({ source: "empty", areas: [] });

  useEffect(() => {
    let mounted = true;

    Promise.all(
      OFFICE_OVERVIEW_AREAS.map(async (item) => {
        try {
          const result = await fetchOfficeTeamRows(item.area);
          const rows = Array.isArray(result?.rows) ? result.rows : [];
          return {
            ...item,
            count: rows.length,
            source: rows.length ? "live" : allowFallback ? result?.source || "preview" : "empty",
            message: rows.length ? result?.message || "Live read-only" : allowFallback ? result?.message || "Control preview" : "No live records",
            top: rows[0]?.[1] || (allowFallback ? item.fallback : "No live records"),
            status: rows[0]?.[2] || (allowFallback ? "Prepared-only" : "Clear"),
          };
        } catch {
          return {
            ...item,
            count: 0,
            source: allowFallback ? "preview" : "empty",
            message: allowFallback ? "Control preview" : "Live check unavailable",
            top: allowFallback ? item.fallback : "No live records",
            status: allowFallback ? "Prepared-only" : "Clear",
          };
        }
      })
    ).then((areas) => {
      if (!mounted) return;
      const liveCount = areas.filter((item) => item.source === "live").length;
      setState({
        source: liveCount ? "live" : allowFallback ? "preview" : "empty",
        liveCount,
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
      source: allowFallback ? "preview" : "empty",
      message: allowFallback ? "Control preview" : "No live records",
      top: allowFallback ? item.fallback : "No live records",
      status: allowFallback ? "Prepared-only" : "Clear",
    }));

    return {
      ...state,
      areas,
      label: state.source === "live" ? `${state.liveCount} live areas loaded` : allowFallback ? "Control preview" : "Live areas clear",
    };
  }, [allowFallback, state]);
}
