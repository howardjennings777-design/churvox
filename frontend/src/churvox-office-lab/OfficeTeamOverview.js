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

export function useOfficeTeamOverview() {
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
            source: rows.length ? "live" : result?.source || "demo",
            message: result?.message || "Demo structure · safe preview",
            top: rows[0]?.[1] || item.fallback,
            status: rows[0]?.[2] || "Prepared-only",
          };
        } catch {
          return {
            ...item,
            count: 0,
            source: "demo",
            message: "Demo structure · safe preview",
            top: item.fallback,
            status: "Prepared-only",
          };
        }
      })
    ).then((areas) => {
      if (!mounted) return;
      const liveCount = areas.filter((item) => item.source === "live").length;
      setState({
        source: liveCount ? "live" : "demo",
        liveCount,
        areas,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  return useMemo(() => {
    const areas = state.areas.length ? state.areas : OFFICE_OVERVIEW_AREAS.map((item) => ({
      ...item,
      count: 0,
      source: "demo",
      message: "Demo structure · safe preview",
      top: item.fallback,
      status: "Prepared-only",
    }));

    return {
      ...state,
      areas,
      label: state.source === "live" ? `${state.liveCount} live areas loaded read-only` : "Demo structure · safe preview",
    };
  }, [state]);
}
