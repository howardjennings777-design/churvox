const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isAdminFix(item) {
  return /fix needed|missing details/i.test(`${item?.type || ''} ${item?.status || ''}`);
}

function isComplete(item) {
  return /approved|parked|fixed/i.test(String(item?.status || ''));
}

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function cleanup() {
  const main = load(MAIN_STORE);
  const ops = load(OPS_STORE);
  const done = [...(main.command || []), ...(ops.commandQueue || [])].filter((item) => isAdminFix(item) && isComplete(item));
  if (!done.length) return;

  const doneKeys = new Set(done.map((item) => item.issueKey || item.id).filter(Boolean));
  main.command = (main.command || []).filter((item) => !doneKeys.has(item.issueKey || item.id));
  ops.commandQueue = (ops.commandQueue || []).filter((item) => !doneKeys.has(item.issueKey || item.id));
  main.audit = [{ action: 'Cleared completed Command fixes', detail: `${doneKeys.size} item(s)`, at: now() }, ...(main.audit || [])].slice(0, 50);
  ops.audit = [{ action: 'Cleared completed Command fixes', detail: `${doneKeys.size} item(s)`, at: now() }, ...(ops.audit || [])].slice(0, 50);
  save(MAIN_STORE, main);
  save(OPS_STORE, ops);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(cleanup, 1200));
  window.addEventListener('hashchange', () => setTimeout(cleanup, 180));
  document.addEventListener('click', () => setTimeout(cleanup, 220));
  setInterval(cleanup, 2400);
}
