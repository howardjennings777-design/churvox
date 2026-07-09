#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function pass(name) {
  checks.push({ name, ok: true });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function expect(name, condition, detail) {
  if (condition) pass(name);
  else fail(name, detail);
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const rootPackage = json('package.json');
const frontendPackage = json('frontend/package.json');
const app = read('frontend/src/App.js');
const labSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const safeControls = read('frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx');
const commandRoutes = read('backend/churvox_command_routes.py');
const usercustomize = read('backend/usercustomize.py');
const plans = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx');

const rootScripts = rootPackage.scripts || {};
const frontendScripts = frontendPackage.scripts || {};

expect('root build script exists', Boolean(rootScripts.build), 'package.json needs scripts.build');
expect('root office lab script forwards to frontend', rootScripts['test:office-lab'] === 'npm --prefix frontend run test:office-lab', 'root test:office-lab must forward to frontend');
expect('root route safety script forwards to frontend', rootScripts['test:rebuild:routes'] === 'npm --prefix frontend run test:rebuild:routes', 'root test:rebuild:routes must forward to frontend');
expect('root script sanity is exposed', rootScripts['test:root-scripts'] === 'node scripts/churvox-root-script-sanity.cjs', 'root test:root-scripts missing');
expect('frontend office lab script exists', Boolean(frontendScripts['test:office-lab']), 'frontend test:office-lab missing');
expect('frontend route safety script exists', Boolean(frontendScripts['test:rebuild:routes']), 'frontend test:rebuild:routes missing');

expect('hidden lab route remains available', app.includes('path="/office-team-lab"') && app.includes('<OfficeTeamLab />'), 'hidden lab route missing');
expect('owner dashboard uses new office app under auth', app.includes('const OwnerOfficeApp = () => <OfficeTeamLab appMode="owner" />') && app.includes('path="/dashboard"') && app.includes('<FreshBusinessRoute><OwnerOfficeApp /></FreshBusinessRoute>'), 'dashboard not wired to owner office app under FreshBusinessRoute');
expect('worker app route remains protected', app.includes('path="/worker/today"') && app.includes('<WorkerRoute><WorkerOfficeApp /></WorkerRoute>'), 'worker route protection missing');
expect('public marketing routes still point to marketing pages', includesAll(app, ['path="/" element={<HomePage />}', 'path="/pricing" element={<PricingPage />}', 'path="/contact" element={<ContactPage />}']), 'public route wiring changed unexpectedly');

expect('owner Command reads backend slips', includesAll(labSite, ['fetchBackendCommandDecisions', 'backendCommand', 'Backend Command']), 'owner Command backend slip wiring missing');
expect('owner Command reads backend audit', includesAll(labSite, ['fetchBackendCommandAudit', 'backendAudit', 'Backend Command audit']), 'owner Activity backend audit wiring missing');
expect('owner app suppresses demo decisions', labSite.includes('isOwnerApp ? [] : demoDecisions'), 'owner app can fall back to demo decisions');
expect('backend Command event refresh wired', labSite.includes('BACKEND_COMMAND_EVENT') && labSite.includes('window.addEventListener(BACKEND_COMMAND_EVENT'), 'backend Command refresh event missing');

expect('frontend Command API has slips and audit endpoints', includesAll(commandApi, ['/api/command/slips', '/api/command/audit', 'createBackendCommandSlip', 'recordBackendCommandDecision']), 'frontend Command API missing endpoint wiring');
expect('frontend Command API preserves safety flags', includesAll(commandApi, ['prepared_only: true', 'owner_review_only: true', 'no_auto_send: true', 'no_auto_sync: true', 'no_auto_charge: true', 'no_auto_record_change: true']), 'frontend Command safety flags missing');
expect('owner safe controls create backend slips', includesAll(safeControls, ['createBackendCommandSlip', 'ownerRoute', 'isOwnerRoute()', 'createOfficeTeamLocalCommand']), 'safe controls do not split owner backend vs lab local behaviour');
expect('safe controls keep no-send copy', safeControls.includes('no send, no sync, no charge, no record change') && safeControls.includes('Nothing was sent, synced, charged or changed'), 'safe controls safety copy missing');

expect('backend Command router exposes expected endpoints', includesAll(commandRoutes, ['@router.get("/command/slips")', '@router.post("/command/slips")', '@router.post("/command/scan")', '@router.patch("/command/slips/{slip_id}/edit")', '@router.post("/command/slips/{slip_id}/approve")', '@router.post("/command/slips/{slip_id}/snooze")', '@router.post("/command/slips/{slip_id}/ignore")', '@router.get("/command/events")', '@router.get("/command/audit")']), 'backend Command endpoints missing');
expect('backend Command approve is record-only', includesAll(commandRoutes, ['"status": "approved_recorded"', '"stored_only": True', 'SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed."']), 'backend approve is not clearly record-only');
expect('backend Command does not write business records', !/(db\.(jobs|clients|quotes|invoices|xero_sync_queue|approved_notifications)\.(insert_one|update_one|delete_one)|send_email|send_sms|stripe)/.test(commandRoutes), 'backend Command route appears to touch real business records or send/sync systems');
expect('backend Command uses Python-compatible optional typing', commandRoutes.includes('from typing import Any, Dict, Optional') && !commandRoutes.includes('Dict[str, Any] | None'), 'backend Command uses newer union typing');
expect('backend autoload includes Command router', includesAll(usercustomize, ['from churvox_command_routes import build_command_router', 'build_command_router(local_db, local_get_current_user, ObjectId)']), 'Command router not autoloaded');

expect('pricing is locked in owner rebuild screen', includesAll(plans, ['["Start", "$39"', '["Crew", "$89"', '["Operator", "$149"', '["Command", "$299"', 'Command Growth Pack remains $99/month + GST']), 'locked pricing copy changed');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  const icon = check.ok ? '✓' : '✗';
  console.log(`${icon} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}

if (failed.length) {
  console.error(`\nReadiness sweep failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nReadiness sweep passed: ${checks.length} checks.`);
