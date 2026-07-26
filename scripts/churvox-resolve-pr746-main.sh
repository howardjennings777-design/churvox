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

for file in "${conflicts[@]}"; do git checkout --theirs -- "$file"; done
for file in .github/workflows/churvox-full-launch-audit.yml scripts/churvox-hardcore-human-cleanup.cjs; do
  if git ls-files -u -- "$file" | grep -q .; then git checkout --ours -- "$file";
  elif git cat-file -e "HEAD:$file" 2>/dev/null; then git show "HEAD:$file" > "$file"; fi
done

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
const HASH_ALIASES = new Map([['team', 'office-team']])
function normaliseOfficeHash() { if (typeof window === 'undefined') return false; const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase(); const canonical = HASH_ALIASES.get(raw); if (!canonical) return false; window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${canonical}`); return true }
function isOfficeOSPreviewPath() { return typeof window !== 'undefined' && window.location.pathname === '/new-command-lab' }
function previewSurface() { if (typeof window === 'undefined') return 'owner'; const value = new URLSearchParams(window.location.search || '').get('surface'); return value === 'public' || value === 'hq' || value === 'blueprint' ? value : 'owner' }
function LegacyOfficeTeamLab(props) { const [routeVersion, setRouteVersion] = React.useState(0); React.useLayoutEffect(() => { if (normaliseOfficeHash()) setRouteVersion((current) => current + 1); const handleRoute = () => { if (normaliseOfficeHash()) setRouteVersion((current) => current + 1) }; window.addEventListener('hashchange', handleRoute); window.addEventListener('popstate', handleRoute); return () => { window.removeEventListener('hashchange', handleRoute); window.removeEventListener('popstate', handleRoute) } }, []); return <OfficeTeamOwnerScreenGuard appMode={props.appMode}><React.Suspense fallback={<main className="cvOfficeLabLoading">Loading Churvox office…</main>}><OfficeTeamLabSite {...props} key={routeVersion} /></React.Suspense></OfficeTeamOwnerScreenGuard> }
function OfficeTeamLab(props) { if (isOfficeOSPreviewPath()) { const surface = previewSurface(); if (surface === 'public') return <PublicSiteConnected />; if (surface === 'hq') return <HQConnected />; if (surface === 'blueprint') return <OfficeOSPreview />; return <OfficeOSWorkingConnected /> } if (props.appMode === 'owner') return <FreshApp />; return <LegacyOfficeTeamLab {...props} /> }
export default OfficeTeamLab
EOF

python - <<'PY'
from pathlib import Path
p=Path('frontend/src/index.js'); t=p.read_text(); m="import './runtime/churvoxProtectedFetchAuthGuardRuntime';\n"; a="import './runtime/churvoxVisibleControlTextRuntime';\n"; p.write_text(t if a in t else t.replace(m,m+a,1))
a=Path('.github/workflows/churvox-full-launch-audit.yml'); t=a.read_text().replace('branches: [main, audit/churvox-pr746-base-20260726]','branches: [main]'); a.write_text(t)
PY

git rm -f .github/workflows/churvox-resolve-pr746-main.yml .github/workflows/churvox-resolve-pr746-visible.yml scripts/churvox-resolve-pr746-main.sh || true
git add -A
if git diff --name-only --diff-filter=U | grep -q .; then git diff --name-only --diff-filter=U; exit 1; fi
git commit -m "Merge current main into audited Churvox rebuild"

mkdir -p merge-export
git rev-parse HEAD > merge-export/commit_sha.txt
git rev-parse HEAD^{tree} > merge-export/final_tree_sha.txt
git rev-parse origin/main > merge-export/main_sha.txt
git rev-parse origin/main^{tree} > merge-export/main_tree_sha.txt
git rev-parse HEAD^1 > merge-export/branch_parent_sha.txt
git diff --name-only origin/main HEAD > merge-export/changed_paths.txt
while IFS= read -r file; do git ls-tree HEAD -- "$file"; done < merge-export/changed_paths.txt > merge-export/tree_entries.tsv
cp frontend/src/churvox-office-lab/OfficeTeamLab.jsx merge-export/OfficeTeamLab.jsx
cp frontend/src/index.js merge-export/index.js
cp .github/workflows/churvox-full-launch-audit.yml merge-export/churvox-full-launch-audit.yml

if [[ "${CHURVOX_EXPORT_MERGE:-0}" == "1" ]]; then exit 0; fi
git push origin HEAD:agent/churvox-office-os-foundation
