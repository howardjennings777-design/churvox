// Temporarily disabled for site recovery.
// Payment breakdown will be moved into the React worker job component instead of DOM injection.

if (typeof window !== 'undefined') {
  window.__CHURVOX_WORKER_PAYMENT_BRIDGE_DISABLED__ = true;
}

export {};
