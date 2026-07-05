// AI Guide and Command assurance runtime.
// Keeps owner home and approval desk labelled correctly without constant repainting.

import './churvoxGuideCommandLayoutRuntime';

const STYLE_ID = 'churvox-guide-command-assurance-style';

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (!hash || hash === 'today' || hash === 'guide' || hash === 'ai-guide' || hash === 'smart-hub' || hash === 'aiguide') return 'aiguide';
  if (hash === 'command' || hash === 'command-desk' || hash === 'command-board') return 'command';
  return '';
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC[data-owner-page="aiguide"] .title h1,
    .churvoxOptionC[data-owner-page="command"] .title h1{letter-spacing:-.045em!important}
    .churvoxOptionC[data-owner-page="command"] #churvox-owner-page-recovery .recoveryHero{box-shadow:0 20px 48px rgba(239,85,60,.18)!important}
    .churvoxOptionC[data-owner-page="aiguide"] #churvox-owner-page-recovery .recoveryHero{box-shadow:0 20px 48px rgba(16,21,19,.14)!important}
  `;
  document.head.appendChild(style);
}

let lastSig = '';
function setHeader(page) {
  const root = document.querySelector('.churvoxOptionC');
  if (!root || !page) return;
  installStyle();
  const h1 = root.querySelector('.title h1');
  const subtitle = root.querySelector('.title p');
  const sig = `${page}:${root.dataset.ownerPage || ''}:${h1?.textContent || ''}:${subtitle?.textContent || ''}`;
  if (sig === lastSig) return;
  lastSig = sig;
  if (root.dataset.ownerPage !== page) root.dataset.ownerPage = page;
  if (page === 'aiguide') {
    if (h1 && h1.textContent !== 'AI Guide') h1.textContent = 'AI Guide';
    if (subtitle && subtitle.textContent !== 'Smart Hub, setup, gaps, money, worker updates and owner checks.') subtitle.textContent = 'Smart Hub, setup, gaps, money, worker updates and owner checks.';
  }
  if (page === 'command') {
    if (h1 && h1.textContent !== 'Command') h1.textContent = 'Command';
    if (subtitle && subtitle.textContent !== 'Owner approval desk: approve, edit, park or send back.') subtitle.textContent = 'Owner approval desk: approve, edit, park or send back.';
  }
  root.querySelectorAll('.cocNav button').forEach((button) => {
    const label = String(button.textContent || '').trim().toLowerCase();
    const active = page === 'aiguide' ? (label === 'ai guide' || label === 'smart hub') : page === 'command' ? label === 'command' : false;
    if (button.classList.contains('active') !== active) button.classList.toggle('active', active);
  });
}

function run() { setHeader(pageKey()); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_GUIDE_COMMAND_ASSURANCE__) {
  window.__CHURVOX_GUIDE_COMMAND_ASSURANCE__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('popstate', () => setTimeout(run, 120));
  window.addEventListener('churvox:fresh-data-updated', () => setTimeout(run, 300));
  document.addEventListener('click', () => setTimeout(run, 600), true);
  setInterval(run, 7000);
  run();
}

export {};
