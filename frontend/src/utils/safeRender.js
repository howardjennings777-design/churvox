export const safeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    const text = value.map((item) => safeText(item)).filter(Boolean).join(", ");
    return text || fallback;
  }

  if (typeof value === "object") {
    return (
      value.message ||
      value.detail ||
      value.error ||
      value.type ||
      value.title ||
      value.name ||
      fallback ||
      "Something went wrong"
    );
  }

  return fallback || "Something went wrong";
};

export const safeReactChild = (value, fallback = "") => safeText(value, fallback);
export const safeArray = (value) => (Array.isArray(value) ? value : []);
export const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
