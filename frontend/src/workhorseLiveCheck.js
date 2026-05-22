// PHASE_4C_WORKHORSE_PAGE_NAMES_LIVE_CHECK
// These names are intentionally kept as runtime strings so the live bundle check can prove the Workhorse page identity deployed.
const workhorsePageNames = [
  'Job Control Board',
  'Client Workbench',
  'Invoice Forge',
  'Quote Press',
  'Field Workbench',
];

if (typeof window !== 'undefined') {
  window.__CHURVOX_WORKHORSE_PAGE_NAMES__ = workhorsePageNames;
}

export default workhorsePageNames;
