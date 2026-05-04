export const norm = (v) => String(v || "").toLowerCase().trim();
export const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
export const unwrap = (v) => (v?.data !== undefined ? v.data : v);
export const money = (v) => (Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : "$0.00");

export const listFrom = (value, keys = []) => {
  const v = unwrap(value);
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  for (const key of keys) if (Array.isArray(v[key])) return v[key];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.actions)) return v.actions;
  if (Array.isArray(v.data)) return v.data;
  return [];
};

export const withFallback = (primary, fallback) => {
  if (Array.isArray(primary) && primary.length) return primary;
  return fallback;
};
