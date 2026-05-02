export function parseApiDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const looksIsoLike = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed);
  const normalized = !hasTimezone && looksIsoLike
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeTime(value) {
  const d = parseApiDate(value);
  if (!d) return "Just now";

  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs <= 0) return "Just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 30) return "Just now";
  if (seconds < 60) return "Less than a minute ago";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatLocalDateTime(d);
}

export function formatLocalDateTime(value) {
  const d = parseApiDate(value);
  if (!d) return "—";
  return d.toLocaleString();
}
