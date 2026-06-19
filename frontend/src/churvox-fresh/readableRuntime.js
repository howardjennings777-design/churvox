// Build-safe readability hooks for the fresh Churvox shell.
// Kept tiny on purpose: pages already carry their own readable styles.

export function forceFreshReadable() {
  try {
    document?.documentElement?.classList?.add("churvox-readable");
  } catch {
    // No-op when document is not available.
  }
}

export function installFreshReadableRuntime() {
  try {
    forceFreshReadable();
  } catch {
    // Keep app boot safe.
  }

  return function cleanupFreshReadableRuntime() {
    // Nothing to clean up for now.
  };
}
