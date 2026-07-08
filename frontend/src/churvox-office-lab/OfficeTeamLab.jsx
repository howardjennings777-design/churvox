import React from 'react'
import OfficeTeamLabTidy from './OfficeTeamLabTidy'
import OfficeTeamScrollGuard from './OfficeTeamScrollGuard'

function OfficeTeamLab() {
  return React.createElement(React.Fragment, null,
    React.createElement(OfficeTeamScrollGuard),
    React.createElement(OfficeTeamLabTidy)
  )
}

export default OfficeTeamLab
