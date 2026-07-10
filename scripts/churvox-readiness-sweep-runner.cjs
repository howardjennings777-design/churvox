#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const target = path.resolve(root, process.argv[2] || 'scripts/churvox-readiness-sweep.cjs');
const source = fs.readFileSync(target, 'utf8');

const staleRule = "expect('platform admin route uses hello email only', hasOwnerConstant(platformAdminRoute) && platformAdminRoute.includes('return userEmail === PLATFORM_OWNER_EMAIL') && !OLD_OWNER_EMAILS.test(platformAdminRoute) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(platformAdminRoute), 'PlatformAdminRoute allows wrong owner access');";

const correctedRule = `expect(
  'platform admin route uses explicit platform-owner allowlist',
  includesAll(platformAdminRoute, [
    'const PLATFORM_OWNER_EMAILS = new Set([',
    '"hello@churvox.com"',
    '"howardjennings77@gmail.com"',
    '"howardjennings777@gmail.com"',
    'PLATFORM_OWNER_EMAILS.has(userEmail)',
    '"platform_owner"',
    '"platform_admin"',
    '"super_admin"',
    'user?.is_platform_owner === true',
    'user?.is_platform_admin === true',
    'user?.is_super_admin === true',
  ])
    && !platformAdminRoute.includes('"admin"')
    && !platformAdminRoute.includes('"owner"')
    && !platformAdminRoute.includes('user?.is_admin'),
  'PlatformAdminRoute must allow only known platform owners and explicit platform/super-admin roles',
);`;

const occurrences = source.split(staleRule).length - 1;
if (occurrences !== 1) {
  console.error(`Readiness compatibility runner expected exactly one stale platform-admin rule, found ${occurrences}.`);
  process.exit(1);
}

const patched = source.replace(staleRule, correctedRule);
const compiled = new Module(target, module);
compiled.filename = target;
compiled.paths = Module._nodeModulePaths(path.dirname(target));
compiled._compile(patched, target);
