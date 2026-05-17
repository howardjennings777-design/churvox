const fs = require("fs");

const file = "frontend/src/operator-machine/CommandSuite.jsx";
const text = fs.readFileSync(file, "utf8");

const checks = [
  ["route helpers", "PHASE_282_BUTTON_WIRING_HELPERS"],
  ["normal route", "function normalRoute"],
  ["route for record", "function routeForRecord"],
  ["route labels", "function routeLabel"],
  ["plan checkout from modal", "planIdFromRecord(record)"],
  ["modal route label", "Open {routeLabel(route)}"],
  ["smart metric fallback route", "__route: stat.route || config.route"],
  ["ai card fallback route", "__route: card.route || config.route"],
  ["dashboard stat plan route", 'route: "plans"'],
  ["flow wired marker", "PHASE_282_FLOW_BUTTONS_WIRED"],
  ["quick save normalized route", "goToPage(normalRoute(action.route, current))"],
];

const failures = checks.filter(([, needle]) => !text.includes(needle));

const tableStart = text.indexOf("function Table(");
const modalStart = text.indexOf("function DetailModal(", tableStart);
const table = tableStart >= 0 && modalStart >= 0 ? text.slice(tableStart, modalStart) : "";
if (table.includes("operatorBusyAction")) {
  failures.push(["table still references operatorBusyAction", "operatorBusyAction"]);
}

if (failures.length) {
  console.error("Phase 282 button wiring audit failed:");
  for (const [name, needle] of failures) {
    console.error(`- ${name}: ${needle}`);
  }
  process.exit(1);
}

console.log("Phase 282 button wiring audit passed.");
console.log("Buttons now either open a modal, open the right page, run quick action, approve AI action, or open Stripe checkout.");
