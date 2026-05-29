#!/usr/bin/env node
/*
  CHURVOX_DEEP_LAUNCH_AUDIT_20260529
  Purpose: launch-grade static audit for the Churvox AI Operator / Command Floor app.

  Run from repo root:
    node frontend/scripts/churvox-deep-launch-audit.js

  This audit is intentionally strict around:
  - duplicate routes/imports
  - duplicate runtime patch panels
  - approval-first locks
  - public invoice/quote customer document rendering
  - pricing and SMS block visibility
  - unsafe DOM HTML writes
  - rough launch wording
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "frontend", "src");
const REPORT = path.join(ROOT, "LAUNCH_DEEP_AUDIT_20260529.md");

function read(file) {
  try { return fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { return ""; }
}

function walk(dir, extensions = new Set([".js", ".jsx", ".css", ".py", ".md", ".json"])) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "build", ".git", "dist", "coverage"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, extensions));
    else if (extensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) { return path.relative(ROOT, file).replace(/\\/g, "/"); }
function countMap(items) { return items.reduce((m, item) => ((m[item] = (m[item] || 0) + 1), m), {}); }
function duplicates(items) { return Object.entries(countMap(items)).filter(([, count]) => count > 1).map(([key, count]) => ({ key, count })); }

const checks = [];
const failures = [];
const warnings = [];
const notes = [];

function addCheck(name, status, details = "") {
  checks.push({ name, status, details });
  if (status === "FAIL") failures.push(`${name}: ${typeof details === "string" ? details : JSON.stringify(details)}`);
  if (status === "WARN") warnings.push(`${name}: ${typeof details === "string" ? details : JSON.stringify(details)}`);
}

const app = read("frontend/src/App.js");
const index = read("frontend/src/index.js");
const pkg = read("frontend/package.json");
const publicInvoice = read("frontend/src/pages/public/PublicInvoicePage.js");
const publicQuote = read("frontend/src/pages/public/PublicQuotePage.js");
const invoiceForm = read("frontend/src/components/forms/InvoiceCreateForm.jsx");
const quoteForm = read("frontend/src/components/forms/QuoteCreateForm.jsx");
const pricingPage = read("frontend/src/pages/marketing/ExecutivePricingPage.jsx");
const plansPage = read("frontend/src/pages/PlansPage.js");
const topTierRoutes = read("backend/churvox_top_tier_routes.py");

// 1. Routes
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const routeDupes = duplicates(routes);
addCheck("Duplicate App.js route paths", routeDupes.length ? "FAIL" : "PASS", routeDupes);

// 2. Imports
const sideEffectImports = [...index.matchAll(/^import\s+['"]([^'"]+)['"];$/gm)].map((m) => m[1]);
const sideEffectDupes = duplicates(sideEffectImports);
addCheck("Duplicate index.js side-effect imports", sideEffectDupes.length ? "FAIL" : "PASS", sideEffectDupes);

// 3. Runtime patch panel overlap
const moneyOldLoaded = index.includes("churvoxMoneyDeskJobContextPatch");
const moneyNewLoaded = index.includes("churvoxMoneyDeskLinkedJobFilterPatch");
addCheck("Money Desk duplicate panel import overlap", moneyOldLoaded && moneyNewLoaded ? "FAIL" : "PASS", { moneyOldLoaded, moneyNewLoaded });
const dispatchPatch = read("frontend/src/concept-c/churvoxWorkSlipDispatchPatch.js");
const dispatchPanelInjection = dispatchPatch.includes("cv-dispatch-linked-job-panel") || dispatchPatch.includes("cvWsdEnsureDispatchPanel");
addCheck("Dispatch Board duplicate panel injection", dispatchPanelInjection ? "FAIL" : "PASS", { dispatchPanelInjection });

// 4. Launch route locks
const locks = {
  "/sms": /<Route\s+path="\/sms"[^>]+Navigate to="\/dashboard"/s.test(app),
  "/integrations": /<Route\s+path="\/integrations"[^>]+Navigate to="\/dashboard"/s.test(app),
  "/automation": /<Route\s+path="\/automation"[^>]+Navigate to="\/dashboard"/s.test(app),
  "/automation/runs": /<Route\s+path="\/automation\/runs"[^>]+Navigate to="\/dashboard"/s.test(app),
};
addCheck("Launch-locked unfinished routes", Object.values(locks).every(Boolean) ? "PASS" : "FAIL", locks);

// 5. Guarded internal routes
const guarded = {
  "/offline-sync": /<Route\s+path="\/offline-sync"[^>]+PrivateRoute/s.test(app),
  "/dispatch-board": /<Route\s+path="\/dispatch-board"[^>]+BusinessRoute/s.test(app),
  "/message-approvals": /<Route\s+path="\/message-approvals"[^>]+BusinessRoute/s.test(app),
  "/trade-presets": /<Route\s+path="\/trade-presets"[^>]+BusinessRoute/s.test(app),
};
addCheck("Internal launch pages guarded", Object.values(guarded).every(Boolean) ? "PASS" : "FAIL", guarded);

// 6. Public docs
const publicInvoiceOk = publicInvoice.includes("CHURVOX_PUBLIC_DOCUMENT_TOTAL_FALLBACK_HARDENING_20260529") && publicInvoice.includes("cpd-line-table") && publicInvoice.includes("line_items") && publicInvoice.includes("paymentDetails");
const publicQuoteOk = publicQuote.includes("CHURVOX_PUBLIC_DOCUMENT_TOTAL_FALLBACK_HARDENING_20260529") && publicQuote.includes("cpd-line-table") && publicQuote.includes("line_items") && publicQuote.includes("validUntil");
addCheck("Public invoice line items/totals/payment details", publicInvoiceOk ? "PASS" : "FAIL");
addCheck("Public quote line items/totals/validity", publicQuoteOk ? "PASS" : "FAIL");

// 7. Editors
const invoiceEditorOk = invoiceForm.includes("CHURVOX_INVOICE_EDITOR_LINE_ITEMS_PREVIEW_20260529") && invoiceForm.includes("payment_details") && invoiceForm.includes("gst_rate") && invoiceForm.includes("line_items");
const quoteEditorOk = quoteForm.includes("CHURVOX_QUOTE_EDITOR_LINE_ITEMS_PREVIEW_20260529") && quoteForm.includes("line_items") && quoteForm.includes("valid_until");
addCheck("Invoice editor line items/GST/payment details", invoiceEditorOk ? "PASS" : "FAIL");
addCheck("Quote editor line items/validity", quoteEditorOk ? "PASS" : "FAIL");

// 8. Pricing/SMS blocks
const publicSmsOk = pricingPage.includes("CHURVOX_SMS_BLOCK_PRICING_20260529") && pricingPage.includes("100") && pricingPage.includes("$10") && pricingPage.includes("500") && pricingPage.includes("$45") && pricingPage.includes("1,000") && pricingPage.includes("$80");
const appSmsOk = plansPage.includes("CHURVOX_SMS_BLOCK_PRICING_20260529") && plansPage.includes("100") && plansPage.includes("$10") && plansPage.includes("500") && plansPage.includes("$45") && plansPage.includes("1,000") && plansPage.includes("$80");
addCheck("Public pricing SMS block prices", publicSmsOk ? "PASS" : "FAIL");
addCheck("In-app Plans SMS block prices", appSmsOk ? "PASS" : "FAIL");

// 9. Approval-first backend surface
const messageEndpointOk = topTierRoutes.includes("/api/message-approvals/send") && topTierRoutes.includes("Message is required") && topTierRoutes.includes("Customer email is required");
const dispatchEndpointOk = topTierRoutes.includes("/api/dispatch/assign") && topTierRoutes.includes("Choose a worker before assigning");
const offlineEndpointOk = topTierRoutes.includes("/api/offline-sync") && topTierRoutes.includes("applied_count");
addCheck("Message approval send endpoint exists", messageEndpointOk ? "PASS" : "FAIL");
addCheck("Dispatch assignment endpoint exists", dispatchEndpointOk ? "PASS" : "FAIL");
addCheck("Offline sync endpoint exists", offlineEndpointOk ? "PASS" : "FAIL");

// 10. HTML write risk scan
const files = walk(SRC, new Set([".js", ".jsx"]));
const htmlWriteFinds = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("innerHTML")) {
    const riskyLines = text.split(/\r?\n/).map((line, i) => ({ line: i + 1, text: line })).filter((row) => row.text.includes("innerHTML"));
    htmlWriteFinds.push({ file: rel(file), lines: riskyLines.slice(0, 8) });
  }
}
addCheck("DOM innerHTML usage review", htmlWriteFinds.length ? "WARN" : "PASS", htmlWriteFinds);

// 11. Rough visible wording scan
const roughTerms = ["TODO", "FIXME", "placeholder", "coming soon", "demo", "sample", "mock", "fake", "unfinished"];
const roughFinds = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lower = text.toLowerCase();
  const hits = roughTerms.filter((term) => lower.includes(term.toLowerCase()));
  if (hits.length) roughFinds.push({ file: rel(file), hits });
}
addCheck("Rough launch wording scan", roughFinds.length ? "WARN" : "PASS", roughFinds.slice(0, 120));

// 12. Package scripts
const pkgOk = pkg.includes('"build"') && pkg.includes("craco build") && pkg.includes('"test:launch"');
addCheck("Frontend package build/test scripts", pkgOk ? "PASS" : "FAIL");

const md = [];
md.push("# Churvox Deep Launch Audit — 2026-05-29");
md.push("");
md.push("This is the strict launch-grade audit for the AI Operator / Command Floor build.");
md.push("");
md.push("## Summary");
md.push("");
md.push(`- Failures: ${failures.length}`);
md.push(`- Warnings: ${warnings.length}`);
md.push("");
for (const check of checks) {
  md.push(`## ${check.name}`);
  md.push("");
  md.push(`Status: **${check.status}**`);
  if (check.details && JSON.stringify(check.details) !== "\"\"" && JSON.stringify(check.details) !== "[]") {
    md.push("");
    md.push("```json");
    md.push(JSON.stringify(check.details, null, 2));
    md.push("```");
  }
  md.push("");
}
md.push("## Required follow-up");
md.push("");
if (failures.length) {
  failures.forEach((item) => md.push(`- FIX: ${item}`));
} else {
  md.push("- No blocking static-audit failures found.");
}
if (warnings.length) {
  warnings.forEach((item) => md.push(`- REVIEW: ${item}`));
} else {
  md.push("- No static-audit warnings found.");
}
md.push("");
md.push("## Next proof step");
md.push("");
md.push("Run `npm --prefix frontend run build` and then live-smoke the core Work Slip flows.");
md.push("");
fs.writeFileSync(REPORT, md.join("\n"));
console.log(md.join("\n"));

if (failures.length) process.exit(1);
