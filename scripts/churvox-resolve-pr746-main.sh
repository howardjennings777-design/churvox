#!/usr/bin/env bash
set -euo pipefail

git config user.name "Churvox Release Bot"
git config user.email "hello@churvox.com"
git fetch origin main

if git merge-base --is-ancestor origin/main HEAD; then
  echo "Current main is already contained in the rebuild branch."
  exit 0
fi

git merge --no-commit --no-ff origin/main || true

mapfile -t conflicts < <(git diff --name-only --diff-filter=U)
printf 'Conflicts found (%s):\n' "${#conflicts[@]}"
printf '%s\n' "${conflicts[@]}"

# Default overlap policy: preserve the newer current-main version.
for file in "${conflicts[@]}"; do
  git checkout --theirs -- "$file"
done

# Keep the rebuild's audited release gate and exact-run cleanup.
for file in \
  .github/workflows/churvox-full-launch-audit.yml \
  scripts/churvox-hardcore-human-cleanup.cjs
do
  if git ls-files -u -- "$file" | grep -q .; then
    git checkout --ours -- "$file"
  elif git cat-file -e "HEAD:$file" 2>/dev/null; then
    git show "HEAD:$file" > "$file"
  fi
done

# Preserve the current FreshApp owner experience from main and add the private,
# connected rebuild surfaces used for release validation and My HQ.
cat > frontend/src/churvox-office-lab/OfficeTeamLab.jsx <<'EOF'
import React from 'react'
import OfficeTeamOwnerScreenGuard from './OfficeTeamOwnerScreenGuard'
import FreshApp from '../churvox-fresh/FreshApp'
import '../churvox-office-os/churvoxCurrentBrand.css'

const OfficeTeamLabSite = React.lazy(() => import('./OfficeTeamLabSite'))
const OfficeOSWorkingConnected = React.lazy(() => import('../churvox-office-os/OfficeOSWorkingConnected'))
const OfficeOSPreview = React.lazy(() => import('../churvox-office-os/OfficeOSPreview'))
const PublicSiteConnected = React.lazy(() => import('../churvox-site-next/PublicSiteConnected'))
const HQConnected = React.lazy(() => import('../churvox-site-next/HQConnected'))

const HASH_ALIASES = new Map([
  ['team', 'office-team'],
])

function normaliseOfficeHash() {
  if (typeof window === 'undefined') return false
  const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase()
  const canonical = HASH_ALIASES.get(raw)
  if (!canonical) return false
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}#${canonical}`,
  )
  return true
}

function isOfficeOSPreviewPath() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/new-command-lab'
}

function previewSurface() {
  if (typeof window === 'undefined') return 'owner'
  const value = new URLSearchParams(window.location.search || '').get('surface')
  if (value === 'public' || value === 'hq' || value === 'blueprint') return value
  return 'owner'
}

function LegacyOfficeTeamLab(props) {
  const [routeVersion, setRouteVersion] = React.useState(0)

  React.useLayoutEffect(() => {
    if (normaliseOfficeHash()) setRouteVersion((current) => current + 1)
    const handleRoute = () => {
      if (normaliseOfficeHash()) setRouteVersion((current) => current + 1)
    }
    window.addEventListener('hashchange', handleRoute)
    window.addEventListener('popstate', handleRoute)
    return () => {
      window.removeEventListener('hashchange', handleRoute)
      window.removeEventListener('popstate', handleRoute)
    }
  }, [])

  return (
    <OfficeTeamOwnerScreenGuard appMode={props.appMode}>
      <React.Suspense fallback={<main className="cvOfficeLabLoading">Loading Churvox office…</main>}>
        <OfficeTeamLabSite {...props} key={routeVersion} />
      </React.Suspense>
    </OfficeTeamOwnerScreenGuard>
  )
}

function OfficeTeamLab(props) {
  if (isOfficeOSPreviewPath()) {
    const surface = previewSurface()
    if (surface === 'public') return <PublicSiteConnected />
    if (surface === 'hq') return <HQConnected />
    if (surface === 'blueprint') return <OfficeOSPreview />
    return <OfficeOSWorkingConnected />
  }
  if (props.appMode === 'owner') return <FreshApp />
  return <LegacyOfficeTeamLab {...props} />
}

export default OfficeTeamLab
EOF

python - <<'PY'
from pathlib import Path

# Preserve current main's runtime set and add the audited global wording repair.
path = Path('frontend/src/index.js')
text = path.read_text()
marker = "import './runtime/churvoxProtectedFetchAuthGuardRuntime';\n"
addition = "import './runtime/churvoxVisibleControlTextRuntime';\n"
if addition not in text:
    if marker not in text:
        raise SystemExit('Could not find protected-fetch import insertion point')
    text = text.replace(marker, marker + addition, 1)
path.write_text(text)

# Remove the temporary audit-only PR base from the permanent release workflow.
audit = Path('.github/workflows/churvox-full-launch-audit.yml')
audit_text = audit.read_text()
audit_text = audit_text.replace(
    'branches: [main, audit/churvox-pr746-base-20260726]',
    'branches: [main]',
)
audit.write_text(audit_text)
PY

git add -A
if git diff --name-only --diff-filter=U | grep -q .; then
  echo "Unresolved merge files remain:"
  git diff --name-only --diff-filter=U
  exit 1
fi

git commit -m "Merge current main into audited Churvox rebuild"
git push origin HEAD:agent/churvox-office-os-foundation
