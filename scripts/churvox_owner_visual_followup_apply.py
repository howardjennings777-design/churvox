from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        print(f"already patched: {label}")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamOwnerScreenGuard.jsx",
    "  const [ready, setReady] = React.useState(!active);",
    "  const [ready, setReady] = React.useState(() => !active || Boolean(user));",
    "owner guard starts ready from verified snapshot",
)
replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamOwnerScreenGuard.jsx",
    "    if (!active || loading || !user) {",
    "    if (!active || !user) {",
    "owner guard does not block verified snapshot during refresh",
)
replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamOwnerScreenGuard.jsx",
    "  if (active && (loading || !ready)) {",
    "  if (active && (!user || !ready)) {",
    "owner guard loading only without verified user",
)
replace_once(
    "frontend/src/runtime/churvoxVisibleLogoutRuntime.js",
    "  const authenticating = document.querySelector('.cvAuthLoading');",
    "  const authenticating = document.querySelector('.cvAuthLoading, .cvOwnerScreenGuardLoading');",
    "hide injected logout during owner screen guard",
)
replace_once(
    "frontend/src/App.js",
    '    visualRepair: "churvox-owner-visual-repair-20260713e",',
    '    visualRepair: "churvox-owner-visual-repair-20260713f",',
    "final visual repair deployment fingerprint",
)

css_path = Path("frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css")
css = css_path.read_text()
rule = """
.cvOwnerReady .cvOwnerPrimaryNav button,
.cvOwnerReady .cvOwnerMore > button,
.cvOwnerReady .cvOwnerUtilityNav button {
  min-height: 44px;
}
"""
if ".cvOwnerReady .cvOwnerUtilityNav button" not in css:
    css_path.write_text(css.rstrip() + "\n\n" + rule.lstrip())
    print("patched: desktop owner navigation touch targets")
else:
    print("already patched: desktop owner navigation touch targets")

contract = r"""#!/usr/bin/env node
const fs = require('fs');
const guard = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamOwnerScreenGuard.jsx', 'utf8');
const logout = fs.readFileSync('frontend/src/runtime/churvoxVisibleLogoutRuntime.js', 'utf8');
const css = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css', 'utf8');
const app = fs.readFileSync('frontend/src/App.js', 'utf8');
const checks = [
  ['guard starts from verified snapshot', guard.includes('React.useState(() => !active || Boolean(user))')],
  ['guard ignores refresh loading when user exists', guard.includes('if (!active || !user)') && !guard.includes('if (!active || loading || !user)')],
  ['guard loading requires missing user or readiness', guard.includes('if (active && (!user || !ready))')],
  ['floating logout hides on guard screen', logout.includes(".cvAuthLoading, .cvOwnerScreenGuardLoading")],
  ['desktop owner navigation is at least 44px', css.includes('.cvOwnerReady .cvOwnerUtilityNav button') && css.includes('min-height: 44px')],
  ['final visual fingerprint exists', app.includes('churvox-owner-visual-repair-20260713f')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
"""
Path("scripts/churvox-owner-visual-followup-contract.cjs").write_text(contract)
print("wrote: owner visual follow-up contract")
