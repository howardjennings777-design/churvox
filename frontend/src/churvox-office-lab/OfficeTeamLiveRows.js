import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";

export function useOfficeTeamRows(area, fallbackRows = [], options = {}) {
  const allowFallback = options.allowFallback !== false;
  const emptyMessage = options.emptyMessage || "No live records found yet";
  const [state, setState] = useState({ source: "demo", rows: [], message: "Demo structure · safe preview" });

  useEffect(() => {
    let mounted = true;
    fetchOfficeTeamRows(area)
      .then((next) => {
        if (!mounted) return;
        setState(next || { source: "demo", rows: [], message: "Demo structure · safe preview" });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ source: "demo", rows: [], message: "Demo structure · safe preview" });
      });
    return () => {
      mounted = false;
    };
  }, [area]);

  return useMemo(() => {
    const liveRows = Array.isArray(state.rows) ? state.rows : [];
    const rows = liveRows.length ? liveRows : allowFallback ? fallbackRows : [];
    const label = liveRows.length
      ? state.message || `Live read-only · ${liveRows.length} records`
      : allowFallback
        ? state.message || "Demo structure · safe preview"
        : emptyMessage;
    return {
      rows,
      label,
      source: liveRows.length ? "live" : allowFallback ? state.source || "demo" : "empty",
      endpoint: state.endpoint || "",
      isLive: liveRows.length > 0,
      isFallback: !liveRows.length && allowFallback && fallbackRows.length > 0,
      isEmpty: !liveRows.length && !allowFallback,
    };
  }, [allowFallback, emptyMessage, fallbackRows, state]);
}

export function selectedRow(displayRows, selected, fallbackRows = []) {
  const rows = Array.isArray(displayRows) ? displayRows : [];
  const selectedKey = rowKey(selected);
  return rows.find((row) => rowKey(row) === selectedKey) || rows[0] || fallbackRows[0] || ["", "No records", "Ready", "No live records found yet."];
}

export function rowKey(row = []) {
  return Array.isArray(row) ? row.map((part) => String(part || "")).join("|") : String(row || "");
}
