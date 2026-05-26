// Runtime markers used to prove the latest Command Floor bundle is live.
export const commandFloorRuntimeMarkers = {
  beenApproved: "CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_CLEAN_CARD_20260527_RUNTIME",
  workSlip: "CHURVOX_COMMAND_FLOOR_WORK_SLIP_FINAL_POLISH_20260527_RUNTIME",
  tallCards: "CHURVOX_COMMAND_FLOOR_REAL_SCROLL_TALL_CARDS_20260527_RUNTIME",
  testingDeploy: "CHURVOX_COMMAND_FLOOR_TESTING_DEPLOY_MARKER_20260527_RUNTIME"
};

if (typeof window !== "undefined") {
  window.__CHURVOX_COMMAND_FLOOR_RUNTIME_MARKERS__ = commandFloorRuntimeMarkers;
}
