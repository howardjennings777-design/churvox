const DEMO_RECORD_RE = /\b(final smoke|playwright test|qa client|qa flow|timer proof|worker timer proof|worker app test|live worker view proof|do not bill)\b/i;

export function isDemoRecord(record) {
  try {
    if (typeof window !== "undefined" && window.localStorage.getItem("churvox:show-demo-records") === "1") {
      return false;
    }
  } catch {
    // Keep normal view clean if local storage is unavailable.
  }

  try {
    const text = JSON.stringify(record || {}).toLowerCase();
    return DEMO_RECORD_RE.test(text);
  } catch {
    return false;
  }
}

export function hideDemoRecords(list) {
  return Array.isArray(list) ? list.filter((item) => !isDemoRecord(item)) : [];
}
