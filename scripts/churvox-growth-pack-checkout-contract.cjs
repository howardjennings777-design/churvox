#!/usr/bin/env node
const fs = require('fs');
const jsx = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx', 'utf8');
const css = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamPlansActions.css', 'utf8');
const checks = [
  ['Growth Pack purchase marker exists', jsx.includes('churvox-growth-pack-checkout-20260713a')],
  ['visible Buy Growth Packs block exists', jsx.includes('Buy Growth Packs') && jsx.includes('cvGrowthPackBuy')],
  ['Stripe add-on checkout is wired', jsx.includes('/billing/create-addon-checkout-session') && jsx.includes('command_growth_pack')],
  ['pack quantity is selectable', jsx.includes('packQuantity') && jsx.includes('[1, 2, 3, 4, 5]')],
  ['active pack count is displayed', jsx.includes('Active packs:') && jsx.includes('activePacks')],
  ['Command requirement is clear', jsx.includes('Select Command to buy packs') && jsx.includes('Growth Packs are only available with Command')],
  ['checkout button has proper touch size', css.includes('.cvGrowthPackBuyAction button') && css.includes('min-height: 52px')],
  ['purchase block is responsive', css.includes('@media (max-width: 900px)') && css.includes('grid-template-columns: 1fr')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
