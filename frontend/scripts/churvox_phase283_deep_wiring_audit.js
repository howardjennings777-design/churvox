const fs = require("fs");

const files = [
  "frontend/src/operator-machine/CommandSuite.jsx",
  "frontend/src/operator-machine/OperatorMachine.jsx",
];

const knownRoutes = new Set([
  "dashboard",
  "work",
  "jobs",
  "clients",
  "crew",
  "team",
  "quotes",
  "invoices",
  "proof",
  "payments",
  "payroll",
  "plans",
  "settings",
]);

function normalRoute(route) {
  const raw = String(route || "").toLowerCase().replace(/\s+/g, "-");
  if (raw === "job") return "jobs";
  if (raw === "work") return "jobs";
  if (raw === "crew" || raw === "worker" || raw === "workers") return "team";
  if (raw === "proof-pay" || raw === "proof_and_pay" || raw === "proofpay") return "proof";
  if (raw === "payment" || raw === "payments" || raw === "cashflow") return "proof";
  if (raw === "client") return "clients";
  if (raw === "quote") return "quotes";
  if (raw === "invoice") return "invoices";
  if (raw === "plan" || raw === "pricing") return "plans";
  if (raw === "setting") return "settings";
  return raw;
}

const failures = [];
const warnings = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const command = read("frontend/src/operator-machine/CommandSuite.jsx");
const operator = read("frontend/src/operator-machine/OperatorMachine.jsx");

const requiredNeedles = [
  ["route helpers", "PHASE_283_DEEP_WIRING_ROUTE_HELPERS"],
  ["deterministic filters", "PHASE_283_DETERMINISTIC_FILTERS"],
  ["normalized page routing", "PHASE_283_NORMALIZED_PAGE_ROUTING"],
  ["record destinations", "PHASE_283_RECORDS_GET_DESTINATIONS"],
  ["flow buttons wired", "PHASE_283_FLOW_BUTTONS_WIRED"],
  ["modal open route label", "Open {routeLabel(route)}"],
  ["plan checkout fallback", "planIdFromRecord(record)"],
  ["metric fallback route", "__route: stat.route || config.route"],
  ["AI card fallback route", "__route: card.route || config.route"],
  ["quick action result modal", "const createdRecord = body.record"],
];

for (const [name, needle] of requiredNeedles) {
  if (!command.includes(needle)) failures.push(`${name} missing: ${needle}`);
}

const tableStart = command.indexOf("function Table(");
const modalStart = command.indexOf("function DetailModal(", tableStart);
const tableBlock = tableStart >= 0 && modalStart >= 0 ? command.slice(tableStart, modalStart) : "";
if (tableBlock.includes("operatorBusyAction") || tableBlock.includes("selected?.__operatorAction")) {
  failures.push("Table must not reference modal-only operatorBusyAction/selected state.");
}

if (!command.includes("disabled={Boolean(operatorBusyAction && selected?.__operatorAction)}")) {
  failures.push("AI Operator modal approve button is not safely disabled while working.");
}

const routeRegexes = [
  /goToPage\("([^"]+)"\)/g,
  /__route:\s*"([^"]+)"/g,
  /route:\s*"([^"]+)"/g,
  /jumpTo:\s*"([^"]+)"/g,
];

for (const regex of routeRegexes) {
  for (const match of command.matchAll(regex)) {
    const raw = match[1];
    const normalized = normalRoute(raw);
    if (!knownRoutes.has(normalized)) {
      failures.push(`Unknown route string "${raw}" normalized to "${normalized}"`);
    }
  }
}

function checkButtons(file, text) {
  const buttonTags = [...text.matchAll(/<button\b[\s\S]*?>/g)];
  let unchecked = 0;

  for (const match of buttonTags) {
    const tag = match[0];
    if (tag.includes("type=\"submit\"")) continue;
    if (tag.includes("onClick=")) continue;
    if (tag.includes("aria-hidden")) continue;

    unchecked += 1;
    const line = text.slice(0, match.index).split("\n").length;
    warnings.push(`${file}:${line} button has no direct onClick/type submit in opening tag`);
  }

  return { total: buttonTags.length, unchecked };
}

for (const file of files) {
  const text = read(file);
  const result = checkButtons(file, text);
  console.log(`${file}: ${result.total} buttons scanned, ${result.unchecked} warning(s).`);
}

const quickActionsMatch = command.match(/const QUICK_ACTIONS_BY_PAGE = \{([\s\S]*?)\n\};\n\nconst QUICK_ACTION_FIELDS/);
if (!quickActionsMatch) {
  failures.push("QUICK_ACTIONS_BY_PAGE block not found.");
} else {
  const quickText = quickActionsMatch[1];
  for (const routeMatch of quickText.matchAll(/route:\s*"([^"]+)"/g)) {
    const route = normalRoute(routeMatch[1]);
    if (!knownRoutes.has(route)) failures.push(`Quick action has bad route: ${routeMatch[1]}`);
  }

  for (const kindMatch of quickText.matchAll(/kind:\s*"([^"]+)"/g)) {
    const kind = kindMatch[1];
    const fieldNeedle = `${kind}: [`;
    if (!command.includes(fieldNeedle) && kind !== "payroll_export" && kind !== "payment_note") {
      failures.push(`Quick action kind "${kind}" may not have a matching field config.`);
    }
  }
}

if (!operator.includes("CommandSuite")) {
  warnings.push("OperatorMachine does not reference CommandSuite in static text scan.");
}

if (failures.length) {
  console.error("\nDEEP WIRING AUDIT FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length) {
    console.error("\nWarnings:");
    for (const warning of warnings.slice(0, 40)) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("\nDEEP WIRING AUDIT PASSED ✅");
if (warnings.length) {
  console.log("\nWarnings to review, not build blockers:");
  for (const warning of warnings.slice(0, 40)) console.log(`- ${warning}`);
}
