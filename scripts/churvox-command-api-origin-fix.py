from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "frontend/src/churvox-office-lab/OfficeTeamCommandApi.js"

text = API.read_text(encoding="utf-8")
old = '''function host() {
  return String(API_BASE || "").replace(/\/$/, "");
}'''
new = '''function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  if (configured) return configured;
  // Local, preview and proxied deployments use the frontend /api bridge.
  // An empty build-time API_BASE must never make Command silently unavailable.
  return typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "";
}'''
count = text.count(old)
if count != 1:
    raise RuntimeError(f"Command API host fallback: expected one match, found {count}")
API.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Applied Command same-origin API fallback.")
