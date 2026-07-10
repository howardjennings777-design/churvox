#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Module = require('module');

const target = path.resolve(__dirname, 'churvox-hardcore-owner-worker-audit.cjs');
let source = fs.readFileSync(target, 'utf8');

source = source.replace(
  "const workerCss = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css');",
  "const workerCss = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css') + '\\n' + read('frontend/src/churvox-office-lab/OfficeTeamWorkerHardcore.css');",
);

source = source.replace(
  "  /function WorkerRoute\\(\\{ children \\}\\)[\\s\\S]*\\bisWorker\\b[\\s\\S]*if \\(!isWorker\\)/.test(app),",
  "  (/function WorkerRoute\\(\\{ children \\}\\)[\\s\\S]*\\bisWorker\\b[\\s\\S]*if \\(!isWorker\\)/.test(app) || all(worker, ['useAuth', 'if (!user || !isWorker)', '<Navigate'])),",
);

source = source.replace(
  "    'mobile-chromium',",
  "    'testInfo.project.name',",
);

source = source.replace(
  "scripts['test:hardcore:logic'] === 'node scripts/churvox-hardcore-owner-worker-audit.cjs'",
  "scripts['test:hardcore:logic'] === 'node scripts/churvox-hardcore-owner-worker-audit-runner.cjs'",
);

if (!source.includes("OfficeTeamWorkerHardcore.css")
  || !source.includes("all(worker, ['useAuth', 'if (!user || !isWorker)', '<Navigate'])")
  || !source.includes("'testInfo.project.name'")) {
  console.error('Hardcore audit runner could not apply the active worker guard, mobile CSS or project-aware checks.');
  process.exit(1);
}

const compiled = new Module(target, module);
compiled.filename = target;
compiled.paths = Module._nodeModulePaths(path.dirname(target));
compiled._compile(source, target);
