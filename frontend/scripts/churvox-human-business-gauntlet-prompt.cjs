#!/usr/bin/env node

const { spawn } = require('node:child_process');
const readline = require('node:readline');

const DEFAULT_FRONTEND = 'https://www.churvox.com';
const DEFAULT_BACKEND = 'https://grassley-backend.onrender.com';

function ask(label, fallback = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = fallback ? `${label} (${fallback}): ` : `${label}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(String(answer || fallback || '').trim());
    });
  });
}

function hasArg(name) {
  return process.argv.includes(name);
}

async function main() {
  const email = await ask('Churvox owner email', process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || 'howardjennings777@gmail.com');
  const pass = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || await ask('Churvox password');

  if (!email || !pass) {
    console.error('Missing email or password. Test not started.');
    process.exit(1);
  }

  const allProjects = hasArg('--all');
  const project = hasArg('--mobile') ? 'mobile-chromium' : 'desktop-chromium';
  const mutate = hasArg('--mutate');
  const extraArgs = process.argv.slice(2).filter((arg) => !['--mobile', '--mutate', '--all'].includes(arg));
  const args = [
    'playwright',
    'test',
    'tests/e2e/churvox-human-business-gauntlet.spec.js',
    '--workers=1',
    ...(!allProjects ? [`--project=${project}`] : []),
    ...extraArgs,
  ];

  const env = {
    ...process.env,
    CHURVOX_OWNER_EMAIL: email,
    CHURVOX_OWNER_PASSWORD: pass,
    PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_FRONTEND,
    PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || DEFAULT_BACKEND,
    CHURVOX_HQ_EMAILS: process.env.CHURVOX_HQ_EMAILS || 'hello@churvox.com,howardjennings777@gmail.com',
    ...(mutate ? { CHURVOX_E2E_MUTATE: '1' } : {}),
  };

  console.log(`\nRunning Churvox human business gauntlet (${allProjects ? 'all projects' : project}${mutate ? ', signup gate on' : ''})...`);
  console.log(`Frontend: ${env.PLAYWRIGHT_BASE_URL}`);
  console.log(`Backend:  ${env.PLAYWRIGHT_API_BASE}\n`);
  const child = spawn('npx', args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
  child.on('exit', (code) => process.exit(code || 0));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
