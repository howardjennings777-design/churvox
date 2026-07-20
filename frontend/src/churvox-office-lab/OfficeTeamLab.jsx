import React from 'react'
import OfficeTeamLabSite from './OfficeTeamLabSite'
import OfficeTeamOwnerScreenGuard from './OfficeTeamOwnerScreenGuard'

const OfficeOSPreview = React.lazy(() => import('../churvox-office-os/OfficeOSPreview'))

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

  if (isOfficeOSPreviewPath()) return <OfficeOSPreview />

  return (
    <OfficeTeamOwnerScreenGuard appMode={props.appMode}>
      <OfficeTeamLabSite {...props} key={routeVersion} />
    </OfficeTeamOwnerScreenGuard>
  )
}

export default OfficeTeamLab
