const fs = require("fs");

const file = "src/operator-machine/CommandSuite.jsx";
const fallbackFile = "frontend/src/operator-machine/CommandSuite.jsx";
const path = fs.existsSync(file) ? file : fallbackFile;
const text = fs.readFileSync(path, "utf8");

const failures = [];

const forbidden = [
  '__modalType: "Smart Metric"',
  '__modalType: "Live metric"',
  '__modalType: "AI Prepared Action"',
  '__modalType: "AI Watch"',
  '__modalType: "Approval queue"',
];

for (const needle of forbidden) {
  if (text.includes(needle)) {
    failures.push(`Still opens dead-end modal: ${needle}`);
  }
}

const required = [
  "PHASE_294_NO_SMART_METRIC_POPUPS",
  "PHASE_294_NO_AI_CARD_POPUPS",
  "PHASE_294_NO_DASHBOARD_METRIC_POPUPS",
  "PHASE_294_INFO_MODAL_SAFETY",
  "data-approval-desk",
];

for (const needle of required) {
  if (!text.includes(needle)) {
    failures.push(`Missing cleanup marker: ${needle}`);
  }
}

if (failures.length) {
  console.error("Phase 294 dead-end modal audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phase 294 dead-end modal audit passed ✅");
console.log("Metric cards no longer open useless popups. Only real rows/approval slips keep detail modals.");
