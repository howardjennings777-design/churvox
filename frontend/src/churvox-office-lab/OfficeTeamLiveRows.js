import { useEffect, useMemo, useState } from "react";
import { fetchOfficeTeamRows } from "./officeTeamApi";

export function isOfficeTeamPreviewRoute() {
  if (typeof window === "undefined") return false;
  const path = String(window.location.pathname || "").replace(/\/+$/, "");
  return path === "/office-team-lab" || path === "/office-lab" || path === "/new-command-lab";
}

export function useOfficeTeamRows(area, fallbackRows = [], options = {}) {
  const allowFallback = options.allowFallback === true
    || (options.allowFallback !== false && isOfficeTeamPreviewRoute());
  const emptyMessage = options.emptyMessage || "No live records found yet";
  const [state, setState] = useState({ source: "loading", rows: [], message: "Checking live records" });

  useEffect(() => {
    let mounted = true;
    setState({ source: "loading", rows: [], message: "Checking live records" });
    fetchOfficeTeamRows(area)
      .then((next) => {
        if (!mounted) return;
        const rows = Array.isArray(next?.rows) ? next.rows : [];
        setState({
          ...(next || {}),
          source: rows.length ? "live" : allowFallback ? "preview" : "empty",
          rows,
          message: rows.length
            ? next?.message || `Live read-only · ${rows.length} records`
            : allowFallback
              ? "Example preview records"
              : emptyMessage,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({
          source: allowFallback ? "preview" : "error",
          rows: [],
          message: allowFallback ? "Example preview records" : "Live records unavailable",
        });
      });
    return () => {
      mounted = false;
    };
  }, [allowFallback, area, emptyMessage]);

  return useMemo(() => {
    const liveRows = Array.isArray(state.rows) ? state.rows : [];
    const rows = liveRows.length ? liveRows : allowFallback ? fallbackRows : [];
    const rawLabel = liveRows.length
      ? state.message || `Live read-only · ${liveRows.length} records`
      : allowFallback
        ? "Example preview records"
        : state.message || emptyMessage;
    const label = cleanLabel(rawLabel);
    return {
      rows,
      label,
      source: liveRows.length ? "live" : allowFallback ? "preview" : state.source || "empty",
      endpoint: state.endpoint || "",
      isLive: liveRows.length > 0,
      isFallback: !liveRows.length && allowFallback && fallbackRows.length > 0,
      isEmpty: !liveRows.length && !allowFallback && state.source !== "loading",
      isLoading: state.source === "loading",
      isError: state.source === "error",
    };
  }, [allowFallback, emptyMessage, fallbackRows, state]);
}

export function selectedRow(displayRows, selected, fallbackRows = []) {
  const rows = Array.isArray(displayRows) ? displayRows : [];
  const selectedKey = rowKey(selected);
  const previewFallback = isOfficeTeamPreviewRoute() && Array.isArray(fallbackRows) ? fallbackRows : [];
  return rows.find((row) => rowKey(row) === selectedKey)
    || rows[0]
    || previewFallback[0]
    || ["", "No live record selected", "Clear", "No live records found yet."];
}

export function rowKey(row = []) {
  return Array.isArray(row) ? row.map((part) => String(part || "")).join("|") : String(row || "");
}

function cleanLabel(value = "") {
  return String(value || "")
    .replace(/Demo structure/gi, "Example preview")
    .replace(/Starter structure/gi, "Example preview")
    .replace(/safe preview/gi, "safe review")
    .replace(/lab preview/gi, "example preview")
    .replace(/hidden lab/gi, "owner workspace");
}
