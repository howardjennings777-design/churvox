const FOCUS_KEY = "churvox:fresh-focus:v1";

export function setFreshFocus(page, id) {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      FOCUS_KEY,
      JSON.stringify({
        page,
        id,
        at: Date.now(),
      })
    );

    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: "focus", page, id },
      })
    );
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export function readFreshFocus(page, fallbackId = "") {
  try {
    if (typeof window === "undefined") return fallbackId;

    const saved = window.localStorage.getItem(FOCUS_KEY);
    if (!saved) return fallbackId;

    const focus = JSON.parse(saved);
    if (!focus || focus.page !== page || !focus.id) return fallbackId;

    window.localStorage.removeItem(FOCUS_KEY);
    return focus.id;
  } catch {
    return fallbackId;
  }
}
