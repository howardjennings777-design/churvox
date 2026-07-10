#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const labSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const approvalPatch = read('backend/churvox_command_approval_fields_patch.py');
const liveWrapper = read('backend/server/__init__.py');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'full Command slip passes edited fields and form title',
  includesAll(labSite, [
    'fields: Array.isArray(detail.fields) ? detail.fields : []',
    'formTitle: detail.formTitle || makeSlipFormTitle(item)',
    'approved form snapshot',
    'Open the full slip to edit and record the owner decision',
  ]),
  'OfficeTeamLabSite must submit the edited full-slip form instead of shortcut approval data',
);

expect(
  'frontend sends edited fields to approval recorder',
  includesAll(commandApi, [
    'function approvalFields(fields = [])',
    '"approve-fields"',
    'fields: approvalFields(approval.fields)',
    'form_title: clean(approval.formTitle || approval.form_title',
    'no_auto_record_change: true',
  ]),
  'OfficeTeamCommandApi must send the approved form snapshot with all safety locks',
);

expect(
  'backend stores a business-scoped record-only approval snapshot',
  includesAll(approvalPatch, [
    'from bson import ObjectId',
    '"/api/command/slips/{slip_id}/approve-fields"',
    'slip = await db.command_slips.find_one({"_id": slip_oid, "business_id": business_id})',
    '"approval_snapshot": approval_snapshot',
    '"stored_only": True',
    '"approved_fields": fields',
    '"no_auto_send": True',
    '"no_auto_sync": True',
    '"no_auto_charge": True',
    '"no_auto_record_change": True',
  ]),
  'approval recorder must remain business-scoped, stored-only and fully safety locked',
);

expect(
  'approval recorder does not touch business records or external systems',
  !/(db\.(jobs|clients|customers|quotes|invoices|time_entries|timesheets|businesses|business_settings|xero_sync_queue|approved_notifications)\.(insert_one|update_one|delete_one)|send_email|send_sms|stripe|xero|myob|tax filing|bank file)/i.test(approvalPatch),
  'approval recorder appears to write a business record or trigger an external system',
);

expect(
  'live Render wrapper loads approval recorder',
  liveWrapper.includes("'churvox_command_approval_fields_patch'"),
  'backend/server/__init__.py must install the approval recorder because it is the live Render wrapper',
);

expect(
  'live smoke checks approval recorder route',
  liveSmoke.includes('/api/command/slips/000000000000000000000000/approve-fields'),
  'live Command smoke must fail if the new approval route is missing from the deployed wrapper',
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}

if (failed.length) {
  console.error(`\nCommand approval readiness failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nCommand approval readiness passed: ${checks.length} checks.`);
