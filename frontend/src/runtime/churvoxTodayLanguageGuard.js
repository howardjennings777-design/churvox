// CHURVOX_TODAY_LANGUAGE_GUARD_20260628
// Keeps the boss-facing OS language aligned: Churvox prepares admin, owner checks approvals.

if (typeof window !== 'undefined' && !window.__CHURVOX_TODAY_LANGUAGE_GUARD__) {
  window.__CHURVOX_TODAY_LANGUAGE_GUARD__ = true;

  const replacements = [
    ['Prepare in Command', 'In approval'],
    ['Open Command', 'Open approvals'],
    ['Command waiting', 'Needs approval'],
    ['forms waiting', 'needs approval'],
    ['Owner decisions are prepared for Command.', 'Churvox prepares admin when a form needs checking.'],
    ['Owner decisions are prepared for Command', 'Churvox prepares admin when a form needs checking'],
    ['Sending decisions go to Command.', 'Approvals appear in Command.'],
    ['Send from Command only.', 'Owner approval required.'],
    ['Command is only for approvals.', 'Approvals are handled in Command.'],
    ['Check, edit, approve or park.', 'Check, edit, approve or park in Command.'],
  ];

  const replaceText = (value) => {
    let next = value;
    replacements.forEach(([from, to]) => {
      if (next.includes(from)) next = next.split(from).join(to);
    });
    return next;
  };

  const sync = () => {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children && node.children.length) return;
      const current = node.textContent || '';
      const next = replaceText(current);
      if (next !== current) node.textContent = next;
    });
  };

  window.addEventListener('load', sync);
  window.addEventListener('hashchange', () => setTimeout(sync, 60));
  document.addEventListener('click', () => setTimeout(sync, 80), true);

  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  sync();
}
