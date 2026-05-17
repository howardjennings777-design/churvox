const fs = require("fs");
const path = require("path");

function findProjectRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "frontend", "src", "operator-machine", "CommandSuite.jsx"))) {
      return candidate;
    }

    if (fs.existsSync(path.join(candidate, "src", "operator-machine", "CommandSuite.jsx"))) {
      return candidate;
    }
  }

  throw new Error("Could not find Churvox project root from audit script.");
}

const root = findProjectRoot();
const commandFile = fs.existsSync(path.join(root, "frontend", "src", "operator-machine", "CommandSuite.jsx"))
  ? path.join(root, "frontend", "src", "operator-machine", "CommandSuite.jsx")
  : path.join(root, "src", "operator-machine", "CommandSuite.jsx");

const text = fs.readFileSync(commandFile, "utf8");

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

const required = [
  ["route helper marker", "PHASE_287_DEEP_WIRING_ROUTE_HELPERS"],
  ["flow marker", "PHASE_287_FLOW_BUTTONS_WIRED"],
  ["known routes", "CHURVOX_KNOWN_ROUTES"],
  ["normalRoute", "function normalRoute"],
  ["routeLabel", "function routeLabel"],
  ["routeForRecord", "function routeForRecord"],
  ["planIdFromRecord", "function planIdFromRecord"],
  ["normalized page routing", "const normalized = normalRoute(nextPage"],
  ["record destinations", "routeForRecord(routed, current)"],
  ["quick-create result modal", "const createdRecord = body.record"],
  ["metric route fallback", "__route: stat.route || config.route"],
  ["AI card route fallback", "__route: card.route || config.route"],
];

for (const [name, needle] of required) {
  if (!text.includes(needle)) failures.push(`${name} missing: ${needle}`);
}

const tableStart = text.indexOf("function Table(");
const modalStart = text.indexOf("function DetailModal(", tableStart);
const tableBlock = tableStart >= 0 && modalStart >= 0 ? text.slice(tableStart, modalStart) : "";

if (tableBlock.includes("operatorBusyAction") || tableBlock.includes("selected?.__operatorAction")) {
  failures.push("Table contains modal-only operatorBusyAction/selected reference.");
}

const routeRegexes = [
  /goToPage\("([^"]+)"\)/g,
  /__route:\s*"([^"]+)"/g,
  /route:\s*"([^"]+)"/g,
];

for (const regex of routeRegexes) {
  for (const match of text.matchAll(regex)) {
    const route = normalRoute(match[1]);
    if (!knownRoutes.has(route)) failures.push(`Unknown route "${match[1]}" normalizes to "${route}"`);
  }
}

const quickBlock = text.match(/const QUICK_ACTIONS_BY_PAGE = \{[\s\S]*?\n\};\n\nconst QUICK_ACTION_FIELDS/);
if (!quickBlock) {
  failures.push("QUICK_ACTIONS_BY_PAGE block missing.");
} else {
  for (const routeMatch of quickBlock[0].matchAll(/route:\s*"([^"]+)"/g)) {
    const route = normalRoute(routeMatch[1]);
    if (!knownRoutes.has(route)) failures.push(`Quick action bad route "${routeMatch[1]}"`);
  }

  for (const kindMatch of quickBlock[0].matchAll(/kind:\s*"([^"]+)"/g)) {
    const kind = kindMatch[1];
    if (!text.includes(`${kind}: [`)) failures.push(`Quick action kind "${kind}" has no field config.`);
  }
}

if (failures.length) {
  console.error("PHASE 288 DEEP WIRING AUDIT FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PHASE 288 DEEP WIRING AUDIT PASSED ✅");
console.log(`Checked: ${commandFile}`);
