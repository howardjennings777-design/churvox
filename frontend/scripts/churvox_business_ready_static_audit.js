const fs = require("fs");
const path = require("path");

function findRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "frontend")) && fs.existsSync(path.join(candidate, "backend", "server.py"))) {
      return candidate;
    }
  }

  throw new Error("Could not find repo root.");
}

const root = findRoot();
const reportPath = path.join(root, "BUSINESS_READY_AUDIT.md");
const jsonPath = path.join(root, "BUSINESS_READY_AUDIT.json");

const blockers = [];
const warnings = [];
const passes = [];

function blocker(area, msg) {
  blockers.push({ area, msg });
}

function warning(area, msg) {
  warnings.push({ area, msg });
}

function pass(area, msg) {
  passes.push({ area, msg });
}

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walkActive(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).replace(/\\/g, "/");

    if (
      rel.includes("node_modules/") ||
      rel.includes("frontend/build/") ||
      rel.includes("frontend/visual-audit/") ||
      rel.includes("business-ready-audit/") ||
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
    if (stat.isDirectory()) walkActive(full, out);
    else out.push(full);
  }

  return out;
}

const command = read("frontend/src/operator-machine/CommandSuite.jsx");
const server = read("backend/server.py");
const app = read("frontend/src/App.js") + "\n" + read("frontend/src/App.jsx");
const pkg = JSON.parse(read("frontend/package.json") || "{}");

console.log("===== STATIC BUSINESS-READY AUDIT =====");

for (const rel of [
  "frontend/src/operator-machine/CommandSuite.jsx",
  "frontend/src/operator-machine/OperatorMachine.jsx",
  "frontend/public/churvox-topwide-theme.css",
  "frontend/package.json",
  "backend/server.py",
]) {
  if (exists(rel)) pass("files", `Found ${rel}`);
  else blocker("files", `Missing ${rel}`);
}

const frontendMustHave = [
  ["CommandSuite", "function CommandSuite"],
  ["Quick action modal", "function QuickActionModal"],
  ["Detail modal", "function DetailModal"],
  ["Smart pages", "function SmartPage"],
  ["Route normalizer", "function normalRoute"],
  ["Record route resolver", "function routeForRecord"],
  ["Quick actions config", "const QUICK_ACTIONS_BY_PAGE"],
  ["Quick action fields", "const QUICK_ACTION_FIELDS"],
];

for (const [label, needle] of frontendMustHave) {
  if (command.includes(needle)) pass("frontend structure", `${label} present.`);
  else blocker("frontend structure", `${label} missing: ${needle}`);
}

const backendMustHave = [
  ["Mongo database", "db = client"],
  ["JWT config", "JWT_SECRET"],
  ["CORS credentials", "allow_credentials=True"],
  ["JSON safety", "make_json_safe"],
  ["Login route text", "login"],
];

for (const [label, needle] of backendMustHave) {
  if (server.includes(needle)) pass("backend structure", `${label} present.`);
  else blocker("backend structure", `${label} missing: ${needle}`);
}

const forbiddenFrontend = [
  "PHASE_292_QUICK_ACTION_FRONTEND_FALLBACK",
  "frontend_quick_action_fallback",
  "Saved on screen. Backend quick-create still needs fixing.",
  "Backend quick-create still needs fixing",
  "Saved on this screen because the backend quick-create endpoint returned an error",
  '__modalType: "Smart Metric"',
  '__modalType: "Live metric"',
  '__modalType: "AI Prepared Action"',
  '__modalType: "AI Watch"',
  '__modalType: "Approval queue"',
];

for (const needle of forbiddenFrontend) {
  if (command.includes(needle)) blocker("fake/dead frontend", `Remove active bad pattern: ${needle}`);
}

const forbiddenBackend = [
  "PHASE_293_ULTRA_SAFE_OPERATOR_QUICK_CREATE",
  "phase293_last_resort",
  "not_persisted_reason",
  '"persisted": False',
  "fallback_used",
];

for (const needle of forbiddenBackend) {
  if (server.includes(needle)) blocker("fake backend save", `Remove fake/fallback save pattern: ${needle}`);
}

const quickEndpointNeedles = [
  "/api/operator/quick-create-real",
  "quick-create-real",
];

if (quickEndpointNeedles.some((needle) => command.includes(needle)) && server.includes("quick-create-real")) {
  pass("quick create", "Frontend and backend both reference quick-create-real.");
} else {
  blocker("quick create", "Frontend/backend do not both reference quick-create-real.");
}

const quickBlock = command.match(/const QUICK_ACTIONS_BY_PAGE = \{[\s\S]*?\n\};\n\nconst QUICK_ACTION_FIELDS/);
if (!quickBlock) {
  blocker("quick actions", "Could not parse QUICK_ACTIONS_BY_PAGE.");
} else {
  const knownRoutes = new Set(["dashboard", "work", "jobs", "clients", "crew", "team", "quotes", "invoices", "proof", "payments", "payroll", "plans", "settings"]);

  for (const match of quickBlock[0].matchAll(/route:\s*"([^"]+)"/g)) {
    const route = match[1];
    const normal = route === "work" ? "jobs" : route === "crew" ? "team" : route === "payments" ? "proof" : route;
    if (!knownRoutes.has(normal)) blocker("quick actions", `Unknown quick action route: ${route}`);
  }

  for (const match of quickBlock[0].matchAll(/kind:\s*"([^"]+)"/g)) {
    const kind = match[1];
    if (!command.includes(`${kind}: [`)) blocker("quick actions", `Missing field config for quick action kind: ${kind}`);
  }

  pass("quick actions", "Quick action routes and field configs scanned.");
}

const activeFiles = [
  ...walkActive(path.join(root, "frontend", "src")),
  ...walkActive(path.join(root, "backend")),
];

const badVisiblePatterns = [
  [/Quick create failed/i, "Quick create failed"],
  [/backend quick-create/i, "backend quick-create"],
  [/still needs fixing/i, "still needs fixing"],
  [/Saved on screen/i, "Saved on screen"],
  [/\[object Object\]/i, "[object Object]"],
  [/lorem ipsum/i, "lorem ipsum"],
  [/not implemented/i, "not implemented"],
  [/debugger/i, "debugger"],
  [/TempPass123/i, "TempPass123"],
];

for (const file of activeFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");

  for (const [regex, label] of badVisiblePatterns) {
    if (regex.test(text)) blocker("bad text / debug", `${rel} contains ${label}`);
  }

  if (/TODO|FIXME/i.test(text)) warning("cleanup", `${rel} contains TODO/FIXME.`);
  if (/coming soon/i.test(text)) warning("launch scope", `${rel} contains Coming Soon.`);
  if (/placeholder/i.test(text)) warning("placeholder scan", `${rel} contains placeholder.`);
}

if (!pkg.scripts?.build) blocker("package", "Frontend build script missing.");
else pass("package", "Frontend build script exists.");

if (!pkg.scripts?.["audit:business-ready-static"]) warning("package", "business-ready static script not yet in package.json.");
if (!pkg.scripts?.["audit:business-ready-runtime"]) warning("package", "business-ready runtime script not yet in package.json.");

const result = {
  generated_at: new Date().toISOString(),
  blockers,
  warnings,
  passes,
  summary: {
    blockers: blockers.length,
    warnings: warnings.length,
    passes: passes.length,
  },
};

const md = [
  "# Churvox Business-Ready Audit",
  "",
  `Generated: ${result.generated_at}`,
  "",
  "## Verdict",
  "",
  blockers.length
    ? `❌ **NOT READY TO RUN A BUSINESS TOMORROW** — ${blockers.length} blocker(s).`
    : "✅ **STATIC CHECK FOUND NO BLOCKERS** — still needs runtime/browser pass.",
  "",
  "## Blockers",
  "",
  blockers.length ? blockers.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
  "",
  "## Warnings",
  "",
  warnings.length ? warnings.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
  "",
  "## Passes",
  "",
  passes.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n"),
  "",
].join("\n");

fs.writeFileSync(reportPath, md);
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

console.log(md);

if (blockers.length) process.exit(1);
