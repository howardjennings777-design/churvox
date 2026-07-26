#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const failures = [];

function requireText(file, text, label = text) {
  const body = read(file);
  if (!body.includes(text)) failures.push(`${file}: missing ${label}`);
}

function forbidText(file, text, label = text) {
  const body = read(file);
  if (body.includes(text)) failures.push(`${file}: forbidden ${label}`);
}

function requireAll(file, values) {
  values.forEach((value) => requireText(file, value));
}

const route = "frontend/src/churvox-office-lab/OfficeTeamLab.jsx";
requireAll(route, [
  "<OfficeOSWorkingConnected />",
  "<OfficeOSPreview />",
  "<PublicSiteConnected />",
  "<HQConnected />",
]);

const owner = "frontend/src/churvox-office-os/OfficeOSConnected.jsx";
requireAll(owner, [
  'import ChurvoxLogo from "../components/ChurvoxLogo"',
  '<ChurvoxLogo size="xl" tone="light"',
  'data-connected-replacement="true"',
  "No sample data will be substituted",
]);
forbidText(owner, ">CV<", "temporary CV logo badge");

const quickPrepare = "frontend/src/churvox-office-os/OfficeOSQuickPrepare.jsx";
requireAll(quickPrepare, [
  "createBackendCommandSlip",
  "connected_office_os_quick_prepare",
  "prepared_only: true",
  "owner_review_only: true",
  "no_auto_send: true",
  "no_auto_sync: true",
  "no_auto_charge: true",
  "no_auto_record_change: true",
]);

const desk = "frontend/src/churvox-office-os/OfficeOSApprovalDesk.jsx";
requireAll(desk, [
  'tab: "Clients"',
  'tab: "Jobs"',
  'tab: "Quotes"',
  'tab: "Invoices"',
  'tab: "Messages"',
  'tab: "Staff"',
  "requiredFieldsReady",
  "recordBackendCommandDecision",
  "fetchBackendCommandAudit",
  "Nothing was sent, paid, charged, filed or synced.",
]);
[
  "/api/clients",
  "/api/jobs",
  "/api/quotes",
  "/api/invoices",
  "/api/messages",
  "/api/workers",
].forEach((endpoint) => forbidText(desk, `fetch("${endpoint}`, `direct replacement write ${endpoint}`));
forbidText(desk, 'method: "POST"', "direct replacement POST");

const wrapper = "frontend/src/churvox-office-os/OfficeOSWorkingConnected.jsx";
requireAll(wrapper, [
  "<OfficeOSQuickPrepare />",
  "<OfficeOSApprovalDesk />",
  "<OfficeOSPreparedRecords />",
]);

const proof = "frontend/src/churvox-office-os/preparedRecordProof.js";
requireAll(proof, [
  "window.location.origin",
  "/api/command/prepared-records/",
  'method: "GET"',
  'credentials: "include"',
  'cache: "no-store"',
]);
forbidText(proof, 'method: "POST"', "prepared proof POST");

const backendProof = "backend/churvox_owner_cockpit_control_patch.py";
requireAll(backendProof, [
  "PREPARED_COLLECTIONS = {",
  '"message_drafts"',
  '"payroll_reviews"',
  "async def require_business_owner(request: Request):",
  "db[collection].find(business_query(user))",
  '("GET", "/api/command/prepared-records/{collection_name}", prepared_records)',
  "No record was changed, sent, paid, filed or synced.",
]);

const server = "frontend/server.cjs";
requireAll(server, [
  "bufferedResponseHeaders",
  'requestHeaders["accept-encoding"] = "identity"',
  "delete requestHeaders.cookie",
  "delete requestHeaders.Cookie",
  "Login backend returned an empty response.",
  "res.end(bodyBuffer)",
]);

const audit = "frontend/tests/e2e/churvox-big-launch-audit.spec.js";
requireAll(audit, [
  "page.addInitScript",
  "window.__CHURVOX_AUTH_STATE__?.status === 'authenticated'",
  "same-origin login returned no token/account JSON",
  "created job never reached the authenticated worker-scoped API",
]);

const visibleTextRuntime = "frontend/src/runtime/churvoxVisibleControlTextRuntime.js";
requireAll(visibleTextRuntime, [
  "installVisibleControlTextRuntime",
  "textLooksHidden",
  "cvVisibleControlTextRepair",
  "cvNeedsVisibleControlLabel",
  "MutationObserver",
]);
requireText("frontend/src/index.js", "./runtime/churvoxVisibleControlTextRuntime");

const humanAudit = "frontend/tests/e2e/churvox-wording-flow-human-audit.spec.js";
requireAll(humanAudit, [
  "pill text not human-visible",
  "owner can move through the whole working site",
  "worker can move through field pages",
  "My HQ is live, organised",
  "private HQ rebuild is wired to the same live My HQ",
]);

const liveHqPage = "frontend/src/pages/ChurvoxHQPage.jsx";
requireAll(liveHqPage, [
  "My Churvox HQ",
  "Live control",
  "Outreach",
  "Tester applications",
  "<PaidLaunchHQSystem />",
  "<ChurvoxPromotionCentre />",
  "<TesterApplicationsInbox />",
  'data-live-hq="true"',
]);

const connectedHq = "frontend/src/churvox-site-next/HQConnected.jsx";
requireAll(connectedHq, [
  'import ChurvoxHQPage from "../pages/ChurvoxHQPage"',
  "<ChurvoxHQPage embedded />",
  'data-live-hq-workspace="true"',
  "No sample businesses, billing totals or tester records are substituted.",
]);
forbidText(connectedHq, "<HQNext />", "sample-only HQ mock");

const publicContract = "frontend/src/churvox-site-next/siteContract.js";
requireAll(publicContract, [
  'name: "Start"', 'price: "$39"',
  'name: "Crew"', 'price: "$89"',
  'name: "Operator"', 'price: "$149"',
  'name: "Command"', 'price: "$299"',
  "Command Growth Pack", "$99",
]);

if (failures.length) {
  console.error(`Churvox Office OS rebuild contract failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Churvox Office OS rebuild contract passed.");
console.log("- Shared C/check logo is the owner source.");
console.log("- Six owner-approved draft/review types are wired through Command.");
console.log("- Prepared draft proof reads are owner-only and GET-only.");
console.log("- Login proxy body handling and deterministic launch auth are locked.");
console.log("- Pill wording is repaired and challenged by a human-visible text audit.");
console.log("- My HQ and the private HQ rebuild share the live platform-owner controls.");
console.log("- Pricing and live-route protection remain unchanged.");
