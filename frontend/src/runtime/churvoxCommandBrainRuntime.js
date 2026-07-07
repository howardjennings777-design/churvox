import './churvoxCommandBrainRuntime.css';

function removeDuplicateCommandIntro() {
  document.querySelector('[data-cvx-command-brain]')?.remove();
}

function start() {
  removeDuplicateCommandIntro();
  window.addEventListener('hashchange', removeDuplicateCommandIntro);
  window.addEventListener('popstate', removeDuplicateCommandIntro);
  window.addEventListener('churvox:data-refresh', removeDuplicateCommandIntro);
  window.addEventListener('churvox-auth-refresh', removeDuplicateCommandIntro);
  window.addEventListener('churvox-owner-app-ready', removeDuplicateCommandIntro);
  const observer = new MutationObserver(removeDuplicateCommandIntro);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
