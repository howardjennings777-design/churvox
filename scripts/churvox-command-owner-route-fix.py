from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


site = SITE.read_text(encoding="utf-8")
site = replace_once(
    site,
    '''export default function OfficeTeamLabSite({ appMode = "lab" }) {
  const isOwnerApp = appMode === "owner";
''',
    '''export default function OfficeTeamLabSite({ appMode = "lab" }) {
  const ownerPath = typeof window !== "undefined" ? String(window.location.pathname || "") : "";
  const isOwnerApp = appMode === "owner" || ownerPath === "/dashboard" || ownerPath.startsWith("/dashboard/");
''',
    "OfficeTeamLabSite owner route fallback",
)
SITE.write_text(site, encoding="utf-8")

print("Applied protected dashboard owner-mode repair.")
