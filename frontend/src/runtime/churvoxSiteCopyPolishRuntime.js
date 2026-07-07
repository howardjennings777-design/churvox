const COPY_POLISH = new Map([
  ['Send the job details properly.', 'Send clear job details.'],
  ['Good requests get faster replies', 'Clear requests get faster replies'],
  ['Tell them what, where and when.', 'Tell the business what, where and when.'],
  ['Use Quote first if you want a price before booking', 'Choose Quote first if you want a price before booking'],
  ['This demo uses fake records. It shows how jobs, workers and owner approvals sit together before anything important moves.', 'This demo uses sample records. It shows how jobs, workers and owner approvals sit together before anything important moves.'],
  ['The owner is not chasing the admin.', 'The owner is not stuck chasing admin.'],
  ['Open the demo, then start the trial.', 'See the demo, then start your trial.'],
  ['Need Churvox help? Email us.', 'Need help with Churvox?'],
  ['See the demo before you email.', 'See the demo or send us a message.'],
  ['Start clean. Choose the plan. Then set up the OS.', 'Start clean. Choose a plan. Then set up your business workspace.'],
  ['Create the login. Churvox unlocks the tester access.', 'Create your login. Churvox unlocks tester access.'],
  ['so there are no fake buttons or dead sections.', 'so the workspace stays clear and practical.'],
  ['Owner command floor', 'Owner workspace'],
  ['Price NZD', 'Price'],
  ['Live style', 'Preview'],
]);

function polishTextNode(node) {
  const value = node.nodeValue;
  if (!value || !value.trim()) return;
  const trimmed = value.trim();
  const replacement = COPY_POLISH.get(trimmed);
  if (!replacement) return;
  node.nodeValue = value.replace(trimmed, replacement);
}

function walk(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    polishTextNode(node);
    node = walker.nextNode();
  }
}

function applyCopyPolish() {
  try { walk(document.body); } catch {}
}

applyCopyPolish();
window.addEventListener('load', applyCopyPolish);
window.addEventListener('hashchange', () => setTimeout(applyCopyPolish, 80));
window.addEventListener('popstate', () => setTimeout(applyCopyPolish, 80));
window.addEventListener('churvox-owner-app-ready', () => setTimeout(applyCopyPolish, 80));

try {
  const observer = new MutationObserver(() => applyCopyPolish());
  observer.observe(document.documentElement, { childList: true, subtree: true });
} catch {}

export {};
