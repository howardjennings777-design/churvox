import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";

export const OFFICE_OVERVIEW_AREAS = [
  { area: "work", label: "Work", screen: "work", fallback: "Jobs and bookings" },
  { area: "clients", label: "Clients", screen: "clients", fallback: "Client memory" },
  { area: "messages", label: "Messages", screen: "messages", fallback: "Replies and updates" },
  { area: "invoices", label: "Invoices", screen: "invoices", fallback: "Drafts and payments" },
  { area: "staff", label: "Staff", screen: "staff", fallback: "Workers and timers" },
  { area: "quotes", label: "Quotes", screen: "quotes", fallback: "Follow-ups and approvals" },
];

export function useOfficeTeamOverview(options = {}) {
  const allowFallback = options.allowFallback !== false;
  const [state, setState] = useState({ source: "demo", areas: [] });

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
            source: rows.length ? "live" : allowFallback ? result?.source || "demo" : "empty",
            message: rows.length ? result?.message || "Live read-only" : allowFallback ? result?.message || "Demo structure · safe preview" : "No demo data",
            top: rows[0]?.[1] || (allowFallback ? item.fallback : "No live records"),
            status: rows[0]?.[2] || (allowFallback ? "Prepared-only" : "Clear"),
          };
        } catch {
          return {
            ...item,
            count: 0,
            source: allowFallback ? "demo" : "empty",
            message: allowFallback ? "Demo structure · safe preview" : "No demo data",
            top: allowFallback ? item.fallback : "No live records",
            status: allowFallback ? "Prepared-only" : "Clear",
          };
        }
      })
    ).then((areas) => {
      if (!mounted) return;
      const liveCount = areas.filter((item) => item.source === "live").length;
      setState({
        source: liveCount ? "live" : allowFallback ? "demo" : "empty",
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
      source: allowFallback ? "demo" : "empty",
      message: allowFallback ? "Demo structure · safe preview" : "No demo data",
      top: allowFallback ? item.fallback : "No live records",
      status: allowFallback ? "Prepared-only" : "Clear",
    }));

    return {
      ...state,
      areas,
      label: state.source === "live" ? `${state.liveCount} live areas loaded read-only` : allowFallback ? "Demo structure · safe preview" : "No demo data shown",
    };
  }, [allowFallback, state]);
}
