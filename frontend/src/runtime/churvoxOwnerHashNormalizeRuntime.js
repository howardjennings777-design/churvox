// Normalise old owner hashes that still point at retired setup/today pages.

import './churvoxCommandLanguageGuardRuntime';
import './churvoxCommandPreparedQueueRuntime';
import './churvoxPageCheckedRuntime';

function normaliseOwnerHash() {
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard')) return;
  const raw = String(window.location.hash || '').replace('#', '').toLowerCase();
  const aliases = {
    today: 'aiguide',
    dashboard: 'aiguide',
    setup: 'aiguide',
    setupassistant: 'aiguide',
    firstrun: 'aiguide',
    guide: 'aiguide',
    'ai-guide': 'aiguide',
    'smart-hub': 'aiguide',
    help: 'support',
    inbox: 'messages',
    'command-desk': 'command',
    'command-board': 'command',
  };
  const target = aliases[raw];
  if (target && target !== raw) {
    window.history.replaceState({}, document.title, `/dashboard#${target}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OWNER_HASH_NORMALIZE__) {
  window.__CHURVOX_OWNER_HASH_NORMALIZE__ = true;
  window.addEventListener('DOMContentLoaded', normaliseOwnerHash);
  window.addEventListener('load', normaliseOwnerHash);
  window.addEventListener('hashchange', () => setTimeout(normaliseOwnerHash, 20));
  window.addEventListener('popstate', () => setTimeout(normaliseOwnerHash, 20));
  setInterval(normaliseOwnerHash, 800);
  normaliseOwnerHash();
}

export {};
