const fs = require("fs");

const checks = [
  ["backend quick-create endpoint", "backend/server.py", "/api/operator/quick-create"],
  ["backend settings endpoint", "backend/server.py", "/api/operator/settings"],
  ["backend payroll export endpoint", "backend/server.py", "/api/operator/payroll/export"],
  ["frontend quick action helpers", "frontend/src/operator-machine/CommandSuite.jsx", "QUICK_ACTIONS_BY_PAGE"],
  ["frontend quick action modal", "frontend/src/operator-machine/CommandSuite.jsx", "function QuickActionModal"],
  ["frontend dashboard quick launch", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_278_DASHBOARD_QUICK_LAUNCH"],
  ["frontend pwa install action", "frontend/src/operator-machine/CommandSuite.jsx", "installChurvoxApp"],
  ["frontend full refresh after action", "frontend/src/operator-machine/CommandSuite.jsx", "refreshWholeBusiness"],
  ["frontend work slip decision box", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_278_WORK_SLIP_DECISION_BOX"],
  ["css quick launch", "frontend/public/churvox-topwide-theme.css", "cs-quick-launch"],
  ["css decision box", "frontend/public/churvox-topwide-theme.css", "cs-decision-box"],
];

const failures = [];
for (const [name, file, needle] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.includes(needle)) failures.push(`${name} missing ${needle}`);
}

if (failures.length) {
  console.error("PHASE 278 functional audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PHASE 278 functional audit passed.");
