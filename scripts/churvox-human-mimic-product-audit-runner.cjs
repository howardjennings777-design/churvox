#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const target = path.resolve(root, process.argv[2] || 'scripts/churvox-human-mimic-product-audit.cjs');
const source = fs.readFileSync(target, 'utf8');

const staleExpression = "fullRunner.includes('only the two past visits are eligible history')";
const correctedExpression = `all(fullRunner, [
      'def build_seed_with_true_edge_cases',
      'str(row.get("_id")) == str(ids["weak_repeat"])',
      'row["scheduled_date"] = suite.iso(5)',
      'suite.build_seed = build_seed_with_true_edge_cases',
      'await suite.main()',
      'asyncio.run(run())',
    ])`;

const occurrences = source.split(staleExpression).length - 1;
if (occurrences !== 1) {
  console.error(`Human mimic audit runner expected exactly one brittle runner-text expression, found ${occurrences}.`);
  process.exit(1);
}

const patched = source.replace(staleExpression, correctedExpression);
const compiled = new Module(target, module);
compiled.filename = target;
compiled.paths = Module._nodeModulePaths(path.dirname(target));
compiled._compile(patched, target);
