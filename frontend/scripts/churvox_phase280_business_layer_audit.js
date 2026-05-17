const fs = require("fs");

const checks = [
  ["setup checklist", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_SETUP_CHECKLIST"],
  ["command briefing", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_TODAYS_COMMAND_BRIEFING"],
  ["specific work slips", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_SPECIFIC_WORK_SLIP_TYPES"],
  ["command search", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_COMMAND_SEARCH"],
  ["job pipeline board", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_JOB_PIPELINE_BOARD"],
  ["client timeline", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_CLIENT_TIMELINE"],
  ["crew workload", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_CREW_WORKLOAD_VIEW"],
  ["invoice control", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_INVOICE_PAYMENT_CONTROL"],
  ["notification centre", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_NOTIFICATION_CENTRE"],
  ["readiness dashboard", "frontend/src/operator-machine/CommandSuite.jsx", "PHASE_280_READINESS_DASHBOARD"],
  ["phase 280 css", "frontend/public/churvox-topwide-theme.css", "PHASE_280_BUSINESS_USEFULNESS_UI"],
];

const failures = [];

for (const [name, file, needle] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.includes(needle)) failures.push(`${name} missing ${needle}`);
}

if (failures.length) {
  console.error("Churvox Phase 280 business layer audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Churvox Phase 280 business layer audit passed.");
console.log("Included: setup checklist, command briefing, typed work slips, command search, job pipeline, client timeline, crew workload, invoice control, notification centre, readiness dashboard.");
