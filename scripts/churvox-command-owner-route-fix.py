from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLab.jsx"
SITE = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


lab = LAB.read_text(encoding="utf-8")
lab = replace_once(
    lab,
    '''function OfficeTeamLab(props) {
  const [routeVersion, setRouteVersion] = React.useState(0)
''',
    '''function OfficeTeamLab(props) {
  const ownerRoute = typeof window !== 'undefined' && (window.location.pathname === '/dashboard' || window.location.pathname.startsWith('/dashboard/'))
  const effectiveAppMode = props.appMode === 'owner' || ownerRoute ? 'owner' : (props.appMode || 'lab')
  const [routeVersion, setRouteVersion] = React.useState(0)
''',
    "OfficeTeamLab effective owner mode",
)
lab = replace_once(
    lab,
    '''    <OfficeTeamOwnerScreenGuard appMode={props.appMode}>
      <OfficeTeamLabSite {...props} key={routeVersion} />
    </OfficeTeamOwnerScreenGuard>
''',
    '''    <OfficeTeamOwnerScreenGuard appMode={effectiveAppMode}>
      <OfficeTeamLabSite {...props} appMode={effectiveAppMode} key={routeVersion} />
    </OfficeTeamOwnerScreenGuard>
''',
    "OfficeTeamLab passes effective owner mode",
)
LAB.write_text(lab, encoding="utf-8")

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
