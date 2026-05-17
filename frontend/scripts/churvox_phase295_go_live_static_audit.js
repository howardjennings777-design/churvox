const fs = require("fs");
const path = require("path");

function findRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "frontend", "src")) && fs.existsSync(path.join(candidate, "backend", "server.py"))) {
      return candidate;
    }
  }

  throw new Error("Could not find Churvox repo root.");
}

const root = findRoot();
const reportPath = path.join(root, "GO_LIVE_AUDIT_REPORT.md");
const jsonPath = path.join(root, "GO_LIVE_AUDIT_REPORT.json");

const blockers = [];
const warnings = [];
const passes = [];

function addBlocker(area, message) {
  blockers.push({ area, message });
}

function addWarning(area, message) {
  warnings.push({ area, message });
}

function addPass(area, message) {
  passes.push({ area, message });
}

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full).replace(/\\/g, "/");

    if (
      rel.includes("node_modules/") ||
      rel.includes("frontend/build/") ||
      rel.includes("frontend/visual-audit/") ||
      rel.includes("frontend/frontend/") ||
      rel.includes(".git/") ||
      rel.includes("__pycache__/") ||
      rel.includes("/tests/") ||
      rel.includes(".bak") ||
      rel.includes(".forcebak") ||
      /\.phase\d+\./.test(rel)
    ) {
      continue;
    }

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }

  return files;
}

const command = read("frontend/src/operator-machine/CommandSuite.jsx");
const shell = read("frontend/src/operator-machine/OperatorMachine.jsx");
const server = read("backend/server.py");
const pkg = JSON.parse(read("frontend/package.json") || "{}");

console.log("===== STATIC AUDIT: FILE PRESENCE =====");

const requiredFiles = [
  "frontend/src/operator-machine/CommandSuite.jsx",
  "frontend/src/operator-machine/OperatorMachine.jsx",
  "frontend/src/operator-machine/renderDeployMarker.js",
  "frontend/public/churvox-topwide-theme.css",
  "frontend/package.json",
  "backend/server.py",
];

for (const file of requiredFiles) {
  if (!exists(file)) addBlocker("files", `Missing required file: ${file}`);
  else addPass("files", `Found ${file}`);
}

console.log("===== STATIC AUDIT: FRONTEND STRUCTURE =====");

if (!command.includes("function QuickActionModal")) addBlocker("quick actions", "QuickActionModal missing.");
else addPass("quick actions", "QuickActionModal exists.");

if (!command.includes("function DetailModal")) addBlocker("modals", "DetailModal missing.");
else addPass("modals", "DetailModal exists.");

if (!command.includes("function SmartPage")) addBlocker("pages", "SmartPage missing.");
else addPass("pages", "SmartPage exists.");

if (!command.includes("const QUICK_ACTIONS_BY_PAGE")) addBlocker("quick actions", "QUICK_ACTIONS_BY_PAGE missing.");
else addPass("quick actions", "QUICK_ACTIONS_BY_PAGE exists.");

if (!command.includes("const QUICK_ACTION_FIELDS")) addBlocker("quick actions", "QUICK_ACTION_FIELDS missing.");
else addPass("quick actions", "QUICK_ACTION_FIELDS exists.");

if (!command.includes("function normalRoute")) addBlocker("routing", "normalRoute missing.");
else addPass("routing", "normalRoute exists.");

if (!command.includes("function routeForRecord")) addBlocker("routing", "routeForRecord missing.");
else addPass("routing", "routeForRecord exists.");

if (!command.includes("PHASE_294_NO_DASHBOARD_METRIC_POPUPS")) {
  addWarning("dead ends", "Dashboard metric popup cleanup marker missing. Some metric cards may still open useless boxes.");
} else {
  addPass("dead ends", "Dashboard metric popup cleanup marker found.");
}

console.log("===== STATIC AUDIT: DEAD-END / FAKE FLOW CHECKS =====");

const forbiddenFrontend = [
  ["frontend fallback", "PHASE_292_QUICK_ACTION_FRONTEND_FALLBACK"],
  ["frontend fallback", "frontend_quick_action_fallback"],
  ["frontend fallback", "Saved on screen. Backend quick-create still needs fixing."],
  ["frontend fallback", "Backend quick-create still needs fixing"],
  ["fake success wording", "Saved on this screen because the backend quick-create endpoint returned an error"],
  ["dead modal", '__modalType: "Smart Metric"'],
  ["dead modal", '__modalType: "Live metric"'],
  ["dead modal", '__modalType: "AI Prepared Action"'],
  ["dead modal", '__modalType: "AI Watch"'],
  ["dead modal", '__modalType: "Approval queue"'],
];

for (const [area, needle] of forbiddenFrontend) {
  if (command.includes(needle)) {
    addBlocker(area, `User-facing or code fallback still present: ${needle}`);
  }
}

const badUserText = [
  "lorem ipsum",
  "undefined",
  "NaN",
  "[object Object]",
  "Quick create failed",
  "backend quick-create",
  "still needs fixing",
  "fucked",
  "bullshit",
];

for (const phrase of badUserText) {
  const lower = command.toLowerCase();
  if (lower.includes(phrase.toLowerCase())) {
    addWarning("wording", `Potential bad user-facing/debug wording in CommandSuite: ${phrase}`);
  }
}

console.log("===== STATIC AUDIT: QUICK ACTION WIRING =====");

const quickBlockMatch = command.match(/const QUICK_ACTIONS_BY_PAGE = \{[\s\S]*?\n\};\n\nconst QUICK_ACTION_FIELDS/);
if (!quickBlockMatch) {
  addBlocker("quick actions", "Could not parse QUICK_ACTIONS_BY_PAGE.");
} else {
  const quickBlock = quickBlockMatch[0];
  const knownRoutes = new Set(["dashboard", "work", "jobs", "clients", "crew", "team", "quotes", "invoices", "proof", "payments", "payroll", "plans", "settings"]);

  for (const routeMatch of quickBlock.matchAll(/route:\s*"([^"]+)"/g)) {
    const route = routeMatch[1];
    const normal = route === "work" ? "jobs" : route === "crew" ? "team" : route === "payments" ? "proof" : route;
    if (!knownRoutes.has(normal)) {
      addBlocker("quick actions", `Unknown quick action route: ${route}`);
    }
  }

  for (const kindMatch of quickBlock.matchAll(/kind:\s*"([^"]+)"/g)) {
    const kind = kindMatch[1];
    if (!command.includes(`${kind}: [`)) {
      addBlocker("quick actions", `Quick action kind has no field config: ${kind}`);
    }
  }

  addPass("quick actions", "Quick action routes and field configs scanned.");
}

console.log("===== STATIC AUDIT: BACKEND CRITICAL ENDPOINTS =====");

const backendNeedles = [
  ["/api/operator/quick-create-safe", "quick-create-safe"],
  ["/api/operator/quick-create", "quick-create"],
  ["/api/auth/login or login route", "login"],
  ["Mongo database handle", "db."],
  ["CORS handling", "allow_credentials"],
  ["JSONResponse or response safety", "JSONResponse"],
];

for (const [label, needle] of backendNeedles) {
  if (!server.includes(needle)) addBlocker("backend", `Backend missing expected marker for ${label}: ${needle}`);
  else addPass("backend", `Backend marker present: ${label}`);
}

const riskyBackend = [
  ["ultra safe fake success", "PHASE_293_ULTRA_SAFE_OPERATOR_QUICK_CREATE"],
  ["fake persisted false", '"persisted": False'],
  ["last resort fake success", "phase293_last_resort"],
  ["not persisted reason", "not_persisted_reason"],
];

for (const [label, needle] of riskyBackend) {
  if (server.includes(needle)) {
    addBlocker("backend", `Go-live blocker: backend still contains fallback/fake-success path: ${label}`);
  }
}

console.log("===== STATIC AUDIT: SEARCH ALL SOURCE FOR DEBUG / PLACEHOLDER TEXT =====");

const sourceFiles = walk(path.join(root, "frontend", "src")).concat(walk(path.join(root, "backend")));

const debugPatterns = [
  /console\.log\(/i,
  /debugger/i,
  /TODO/i,
  /FIXME/i,
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /not implemented/i,
  /quick-create still needs fixing/i,
  /saved on screen/i,
  /TempPass123/i,
];

for (const file of sourceFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");

  for (const pattern of debugPatterns) {
    if (pattern.test(content)) {
      addWarning("source scan", `${rel} contains ${pattern}`);
    }
  }
}

console.log("===== STATIC AUDIT: PACKAGE SCRIPTS =====");

if (!pkg.scripts?.build) addBlocker("package", "frontend package.json missing build script.");
else addPass("package", "Build script exists.");

if (!pkg.scripts?.["audit:go-live-static"]) addWarning("package", "audit:go-live-static script will be added by this phase.");
if (!pkg.scripts?.["audit:go-live-runtime"]) addWarning("package", "audit:go-live-runtime script will be added by this phase.");

const result = {
  generated_at: new Date().toISOString(),
  blockers,
  warnings,
  passes,
  summary: {
    blocker_count: blockers.length,
    warning_count: warnings.length,
    pass_count: passes.length,
  },
};

const md = [
  "# Churvox no-bullshit go-live audit",
  "",
  `Generated: ${result.generated_at}`,
  "",
  "## Verdict",
  "",
  blockers.length
    ? `❌ **NOT READY FOR GO-LIVE** — ${blockers.length} blocker(s) found.`
    : "✅ **STATIC AUDIT FOUND NO BLOCKERS** — still requires runtime/manual sign-off.",
  "",
  "## Blockers",
  "",
  blockers.length
    ? blockers.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n")
    : "None.",
  "",
  "## Warnings",
  "",
  warnings.length
    ? warnings.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n")
    : "None.",
  "",
  "## Passes",
  "",
  passes.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n"),
  "",
].join("\n");

fs.writeFileSync(reportPath, md);
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

console.log(md);

if (blockers.length) {
  process.exit(1);
}
