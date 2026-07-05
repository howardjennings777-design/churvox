// AI Guide and Command assurance runtime.
// Keeps the owner home and approval desk labelled correctly after legacy fallbacks or route aliases run.

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

function setHeader(page) {
  const root = document.querySelector('.churvoxOptionC');
  if (!root || !page) return;
  installStyle();
  root.dataset.ownerPage = page;
  const h1 = root.querySelector('.title h1');
  const subtitle = root.querySelector('.title p');
  if (page === 'aiguide') {
    if (h1) h1.textContent = 'AI Guide';
    if (subtitle) subtitle.textContent = 'Smart Hub, setup, gaps, money, worker updates and owner checks.';
  }
  if (page === 'command') {
    if (h1) h1.textContent = 'Command';
    if (subtitle) subtitle.textContent = 'Owner approval desk: approve, edit, park or send back.';
  }
  root.querySelectorAll('.cocNav button').forEach((button) => {
    const label = String(button.textContent || '').trim().toLowerCase();
    if (page === 'aiguide') button.classList.toggle('active', label === 'ai guide' || label === 'smart hub');
    if (page === 'command') button.classList.toggle('active', label === 'command');
  });
}

function run() {
  setHeader(pageKey());
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_GUIDE_COMMAND_ASSURANCE__) {
  window.__CHURVOX_GUIDE_COMMAND_ASSURANCE__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 90));
  window.addEventListener('popstate', () => setTimeout(run, 90));
  window.addEventListener('churvox:fresh-data-updated', run);
  document.addEventListener('click', () => setTimeout(run, 120), true);
  setInterval(run, 900);
  run();
}

export {};