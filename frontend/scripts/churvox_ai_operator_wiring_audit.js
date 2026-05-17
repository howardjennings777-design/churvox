const fs = require("fs");

const checks = [
  ["backend strong engine", "backend/server.py", "PHASE_274_STRONG_AI_OPERATOR_ENGINE"],
  ["backend approve middleware", "backend/server.py", "churvox_phase274_ai_operator_approval_engine"],
  ["backend invoice draft", "backend/server.py", "_phase274_create_invoice_draft_from_job"],
  ["backend quote follow-up", "backend/server.py", "_phase274_prepare_quote_followup"],
  ["backend reminder draft", "backend/server.py", "_phase274_prepare_payment_reminder"],
  ["frontend loads AI actions", "frontend/src/operator-machine/CommandSuite.jsx", "refreshOperatorActions"],
  ["frontend maps AI actions", "frontend/src/operator-machine/CommandSuite.jsx", "operatorActionToApproval"],
  ["frontend approves AI actions", "frontend/src/operator-machine/CommandSuite.jsx", "/api/ai/actions/"],
];

const failures = [];
for (const [name, file, needle] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.includes(needle)) failures.push(`${name} missing ${needle}`);
}

if (failures.length) {
  console.error("AI Operator wiring audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AI Operator wiring audit passed.");
