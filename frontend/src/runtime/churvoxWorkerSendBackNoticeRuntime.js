const SEND_BACK_NOTICE_FLAG = '__CHURVOX_WORKER_SEND_BACK_NOTICE_RUNTIME__';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return idOf(value.id || value._id || value.job_id || value.$oid || value.oid || '');
  return '';
}

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ['jobs', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function apiBase() {
  const host = window.location.hostname.toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return 'https://grassley-backend.onrender.com';
  return '';
}

function jobIdFromPath() {
  const match = window.location.pathname.match(/^\/worker\/jobs\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function sentBackText(job) {
  return clean(
    job?.send_back_note ||
    job?.boss_note ||
    job?.owner_note ||
    job?.owner_message ||
    job?.sent_back_note ||
    job?.worker_action_note ||
    job?.review_note ||
    job?.admin_note ||
    ''
  );
}

function hasSentBackState(job) {
  const state = clean([
    job?.work_review_status,
    job?.review_status,
    job?.owner_review_status,
    job?.worker_action_required,
    job?.status,
  ].join(' ')).toLowerCase();
  return /sent[_ -]?back|owner needs fix|worker action required|true/.test(state) || Boolean(sentBackText(job));
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
  const body = document.querySelector('.swBody');
  if (!body) return;
  const existing = document.getElementById('churvox-worker-sendback-notice');
  if (existing) existing.remove();

  const card = document.createElement('section');
  card.id = 'churvox-worker-sendback-notice';
  card.className = 'swCard swActionCard swOwnerSendBackNotice';
  card.innerHTML = `
    <span>Owner needs fix</span>
    <h2>Boss sent this back</h2>
    <p>${escapeHtml(note || 'Owner needs fix before this job is finished.')}</p>
  `;
  body.insertBefore(card, body.firstChild);
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function refreshSendBackNotice() {
  const jobId = jobIdFromPath();
  if (!jobId) return;
  const token = window.localStorage.getItem('token') || '';
  if (!token) return;

  try {
    const res = await fetch(`${apiBase()}/api/worker/jobs?ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return;
    const payload = await res.json().catch(() => ({}));
    const jobs = listFrom(payload);
    const job = jobs.find((item) => idOf(item) === jobId);
    if (!job || !hasSentBackState(job)) return;
    renderNotice(sentBackText(job));
  } catch {}
}

function schedule() {
  [0, 250, 800, 1600, 3200].forEach((delay) => window.setTimeout(refreshSendBackNotice, delay));
}

if (typeof window !== 'undefined' && !window[SEND_BACK_NOTICE_FLAG]) {
  window[SEND_BACK_NOTICE_FLAG] = true;
  installStyles();
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-worker-app-ready', schedule);
  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith('/worker/jobs/')) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
