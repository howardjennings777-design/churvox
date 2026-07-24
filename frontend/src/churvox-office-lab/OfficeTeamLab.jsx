import React from 'react'
import OfficeTeamOwnerScreenGuard from './OfficeTeamOwnerScreenGuard'
import FreshApp from '../churvox-fresh/FreshApp'

const OfficeTeamLabSite = React.lazy(() => import('./OfficeTeamLabSite'))

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

function OfficeTeamLab(props) {
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

  if (props.appMode === 'owner') return <FreshApp />

  return (
    <OfficeTeamOwnerScreenGuard appMode={props.appMode}>
      <React.Suspense fallback={<main className="cvOfficeLabLoading">Loading Churvox office…</main>}>
        <OfficeTeamLabSite {...props} key={routeVersion} />
      </React.Suspense>
    </OfficeTeamOwnerScreenGuard>
  )
}

export default OfficeTeamLab
