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
