const SEND_BACK_NOTICE_FLAG = '__CHURVOX_WORKER_SEND_BACK_NOTICE_RUNTIME__';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function isWorkerJobDetail() {
  return /^\/worker\/jobs\/[^/?#]+/i.test(window.location.pathname || '');
}

function installStyles() {
  if (document.getElementById('churvox-worker-sendback-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-worker-sendback-style';
  style.textContent = `
    .swOwnerSendBackNotice{border:1px solid rgba(249,115,22,.35);background:linear-gradient(135deg,#fff7ed,#fff);box-shadow:0 16px 35px rgba(15,23,42,.08)}
    .swOwnerSendBackNotice span{display:inline-flex;align-items:center;border-radius:999px;background:#111827;color:#fff;padding:6px 10px;font-size:12px;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
    .swOwnerSendBackNotice h2{margin:10px 0 6px;color:#111827;font-size:22px;line-height:1.08}
    .swOwnerSendBackNotice p{margin:0;color:#374151;font-weight:700;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function renderNotice(note) {
  if (!isWorkerJobDetail()) return false;
  const body = document.querySelector('.swBody');
  if (!body) return false;
  const existing = document.getElementById('churvox-worker-sendback-notice');
  if (existing) return true;

  const card = document.createElement('section');
  card.id = 'churvox-worker-sendback-notice';
  card.className = 'swCard swActionCard swOwnerSendBackNotice';
  card.innerHTML = `
    <span>Owner needs fix</span>
    <h2>Boss sent this back</h2>
    <p>${escapeHtml(note || 'Checking sent back notes and owner updates for this job.')}</p>
  `;
  body.insertBefore(card, body.firstChild);
  return true;
}

function schedule() {
  [0, 100, 250, 600, 1200, 2500, 5000, 9000, 13000].forEach((delay) => {
    window.setTimeout(() => renderNotice(''), delay);
  });
}

if (typeof window !== 'undefined' && !window[SEND_BACK_NOTICE_FLAG]) {
  window[SEND_BACK_NOTICE_FLAG] = true;
  installStyles();
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-worker-app-ready', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}
