export const safeArray = (value) => (Array.isArray(value) ? value : []);

export const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  const src = value?.data ?? value;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") {
    for (const key of keys) {
      if (Array.isArray(src?.[key])) return src[key];
    }
    if (Array.isArray(src?.items)) return src.items;
  }
  return [];
};

export const statusOf = (value) => String(value || "").toLowerCase().trim();
export const norm = (value) => String(value || "").toLowerCase().trim();
export const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

export const money = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "AUD" });
};

export const safeText = (value, fallback = "Not available") => {
  const text = String(value || "").trim();
  return text || fallback;
};

export const textOr = safeText;

export const findByIds = (list, ids, keys = ["id", "_id"]) => {
  const wanted = safeArray(ids).map((v) => String(v || "")).filter(Boolean);
  if (!wanted.length) return null;
  return safeArray(list).find((item) => keys.some((key) => wanted.includes(String(item?.[key] || "")))) || null;
};
