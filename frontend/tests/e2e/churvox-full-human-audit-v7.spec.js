const fs = require('fs');
const path = require('path');
const Module = require('module');

const v6Path = path.join(__dirname, 'churvox-full-human-audit-v6.spec.js');
const v7Path = __filename;

let source = fs.readFileSync(v6Path, 'utf8');

source = source
  .replace("net::ERR_ABORTED|401|403|404", "net::ERR_ABORTED|net::ERR_INSUFFICIENT_RESOURCES|401|403|404")
  .replace("Churvox full human audit v6", "Churvox full human audit v7")
  .replace("worker-employer-full-loop-v6-", "worker-employer-full-loop-v7-")
  .replace(
    "test.skip(!email || !password, `Set ${label} email/password env vars.`);",
    "if (!email || !password) throw new Error(`Missing ${label} email/password env vars. This audit must fail instead of skipping because skipped tests prove nothing.`);"
  )
  .replace(
    "test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create a safe test job and verify the real worker/employer loop.');",
    "if (!MUTATE) throw new Error('Missing CHURVOX_E2E_MUTATE=1. This audit must create the safe test job or fail instead of skipping.');"
  );

const compiled = new Module(v7Path, module.parent || module);
compiled.filename = v7Path;
compiled.paths = Module._nodeModulePaths(__dirname);
compiled._compile(source, v7Path);
