// Public trust and help pages are now first-class Churvox routes.
//
// Older paid-launch code redirected /security, /support and
// /refunds-cancellations into generic legal/contact pages before React
// could render them. That behaviour made separate public rooms impossible
// and also changed the URL unexpectedly. Keep this module as a harmless
// compatibility marker because older startup code still imports it.

if (typeof window !== 'undefined') {
  window.__CHURVOX_PUBLIC_HELP_ROUTE_GUARD__ = 'first-class-public-routes-20260724';
}

export {};
