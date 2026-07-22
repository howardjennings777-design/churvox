import React from 'react'
import OfficeTeamLabSite from './OfficeTeamLabSite'
import OfficeTeamOwnerScreenGuard from './OfficeTeamOwnerScreenGuard'

const OfficeOSConnected = React.lazy(() => import('../churvox-office-os/OfficeOSConnected'))
const OfficeOSPreview = React.lazy(() => import('../churvox-office-os/OfficeOSPreview'))
const PublicSiteNext = React.lazy(() => import('../churvox-site-next/PublicSiteNext'))
const HQNext = React.lazy(() => import('../churvox-site-next/HQNext'))

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

  if (isOfficeOSPreviewPath()) {
    const surface = previewSurface()
    if (surface === 'public') return <PublicSiteNext />
    if (surface === 'hq') return <HQNext />
    if (surface === 'blueprint') return <OfficeOSPreview />
    return <OfficeOSConnected />
  }

  return (
    <OfficeTeamOwnerScreenGuard appMode={props.appMode}>
      <OfficeTeamLabSite {...props} key={routeVersion} />
    </OfficeTeamOwnerScreenGuard>
  )
}

export default OfficeTeamLab
