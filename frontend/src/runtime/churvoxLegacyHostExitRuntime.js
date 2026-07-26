// Churvox is hosted on Render again. Keep this compatibility module as a no-op
// because older builds still import it during the staged migration.
export function exitLegacyRenderHost() {
  return false;
}
