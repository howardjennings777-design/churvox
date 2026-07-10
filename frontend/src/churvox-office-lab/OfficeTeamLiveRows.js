import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";

export function useOfficeTeamRows(area, fallbackRows = [], options = {}) {
  const allowFallback = options.allowFallback !== false;
  const emptyMessage = options.emptyMessage || "No live records found yet";
  const [state, setState] = useState({ source: "starter", rows: [], message: "Starter structure · safe review" });

  useEffect(() => {
    let mounted = true;
    fetchOfficeTeamRows(area)
      .then((next) => {
        if (!mounted) return;
        setState(next || { source: "starter", rows: [], message: "Starter structure · safe review" });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ source: "starter", rows: [], message: "Starter structure · safe review" });
      });
    return () => {
      mounted = false;
    };
  }, [area]);

  return useMemo(() => {
    const liveRows = Array.isArray(state.rows) ? state.rows : [];
    const rows = liveRows.length ? liveRows : allowFallback ? fallbackRows : [];
    const rawLabel = liveRows.length
      ? state.message || `Live read-only · ${liveRows.length} records`
      : allowFallback
        ? state.message || "Starter structure · safe review"
        : emptyMessage;
    const label = cleanLabel(rawLabel);
    return {
      rows,
      label,
      source: liveRows.length ? "live" : allowFallback ? state.source || "starter" : "empty",
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

function cleanLabel(value = "") {
  return String(value || "")
    .replace(/Demo structure/gi, "Starter structure")
    .replace(/safe preview/gi, "safe review")
    .replace(/lab preview/gi, "control review")
    .replace(/hidden lab/gi, "owner workspace");
}
