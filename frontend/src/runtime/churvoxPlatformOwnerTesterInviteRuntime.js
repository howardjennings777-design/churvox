const FLAG = '__CHURVOX_HQ_TESTER_INVITE_RUNTIME__';
const PANEL_ID = 'churvox-hq-tester-invite-panel';
const ENDPOINT_RE = /\/api\/admin\/owner\/tester-intake(?:\?|$)/;

function isHq() {
  try {
    return Boolean(document.querySelector('[data-churvox-native-hq="1"]')) || ['/admin', '/owner/dashboard', '/platform-dashboard', '/app-owner'].includes(window.location.pathname);
  } catch {
    return false;
  }
}

function clean(value) {
  return String(value || '').trim();
}

function getLastInvite() {
  try { return window.__CHURVOX_LAST_TESTER_INVITE__ || null; } catch { return null; }
}

function setLastInvite(value) {
  try { window.__CHURVOX_LAST_TESTER_INVITE__ = value; } catch {}
}

function parseBody(init) {
  try {
    if (!init || !init.body) return {};
    if (typeof init.body === 'string') return JSON.parse(init.body || '{}');
  } catch {}
  return {};
}

function apiRootFromUrl(url) {
  try {
    const text = clean(url);
    const index = text.indexOf('/api/admin/owner/tester-intake');
    if (index <= 0) return '';
    return text.slice(0, index).replace(/\/$/, '');
  } catch {
    return '';
  }
}

function linkFromInvite(invite) {
  const body = invite?.response || {};
  const request = invite?.request || {};
  const direct = clean(body.signup_link || body.login_link || body.access_link);
  if (direct) return direct;
  const email = clean(body?.tester?.email || request.email).toLowerCase();
  if (!email || !email.includes('@')) return '';
  const status = clean(body?.tester?.status).toLowerCase();
  const path = status === 'access_granted' || body.user ? '/login' : '/signup';
  const params = new URLSearchParams({ email });
  if (path === '/signup') params.set('tester', '1');
  return `${window.location.origin}${path}?${params.toString()}`;
}

function statusText(invite) {
  const body = invite?.response || {};
  const sent = body?.email?.email_sent === true;
  const hasError = clean(body?.email?.error);
  if (sent) return 'Tester email sent. You can also copy the link below.';
  if (hasError) return `Email did not confirm as sent: ${hasError}`;
  return 'Tester saved. Copy the link or resend the email.';
}

async function copyText(value) {
  const text = clean(value);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', 'readonly');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      input.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function resendInvite(button) {
  const invite = getLastInvite();
  const request = { ...(invite?.request || {}), send_email: true };
  if (!clean(request.email)) return;
  const oldText = button.textContent;
  button.textContent = 'Resending…';
  button.disabled = true;
  try {
    const apiRoot = clean(invite?.apiRoot || window.__CHURVOX_LAST_TESTER_API_ROOT__ || '');
    const response = await window.__CHURVOX_ORIGINAL_FETCH__(`${apiRoot}/api/admin/owner/tester-intake`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
      },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => ({}));
    setLastInvite({ request, response: body, apiRoot, at: Date.now() });
    button.textContent = body?.email?.email_sent ? 'Email resent' : 'Saved again';
    setTimeout(injectPanel, 50);
  } catch {
    button.textContent = 'Resend failed';
  } finally {
    setTimeout(() => { button.disabled = false; button.textContent = oldText; }, 1800);
  }
}

function findTesterForm() {
  const forms = [...document.querySelectorAll('form')];
  return forms.find((form) => form.textContent && /add tester|save tester|grant access/i.test(form.textContent));
}

function injectPanel() {
  if (!isHq()) return;
  const invite = getLastInvite();
  if (!invite) return;
  const form = findTesterForm();
  if (!form) return;
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    form.appendChild(panel);
  }
  const link = linkFromInvite(invite);
  const email = clean(invite?.response?.tester?.email || invite?.request?.email).toLowerCase();
  panel.innerHTML = `
    <div style="margin-top:14px;border:1px solid #fed7aa;background:#fff7ed;border-radius:20px;padding:14px;display:grid;gap:10px;box-shadow:0 12px 30px rgba(15,23,42,.06);">
      <div>
        <b style="display:block;color:#0f172a;font-size:14px;">Tester invite control</b>
        <span style="display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:800;">${statusText(invite)}</span>
      </div>
      ${link ? `<input value="${link.replace(/"/g, '&quot;')}" readonly style="width:100%;border:1px solid #fdba74;background:white;color:#0f172a;border-radius:14px;padding:11px 12px;font-size:12px;font-weight:800;" />` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${link ? '<button type="button" data-hq-copy-link="1" style="border:1px solid #fdba74;background:white;color:#0f172a;border-radius:14px;padding:10px 12px;font-weight:950;cursor:pointer;">Copy link</button>' : ''}
        ${link ? '<button type="button" data-hq-open-link="1" style="border:1px solid #fdba74;background:#0f172a;color:white;border-radius:14px;padding:10px 12px;font-weight:950;cursor:pointer;">Open link</button>' : ''}
        ${email ? '<button type="button" data-hq-resend-invite="1" style="border:1px solid #fdba74;background:#f97316;color:white;border-radius:14px;padding:10px 12px;font-weight:950;cursor:pointer;">Resend email</button>' : ''}
      </div>
    </div>
  `;
}

function installFetchCapture() {
  if (window.__CHURVOX_ORIGINAL_FETCH__) return;
  window.__CHURVOX_ORIGINAL_FETCH__ = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isTesterIntake = ENDPOINT_RE.test(url);
    const request = isTesterIntake ? parseBody(init) : null;
    const apiRoot = isTesterIntake ? apiRootFromUrl(url) : '';
    const response = await window.__CHURVOX_ORIGINAL_FETCH__(input, init);
    if (isTesterIntake) {
      try {
        const cloned = response.clone();
        const body = await cloned.json().catch(() => ({}));
        try { window.__CHURVOX_LAST_TESTER_API_ROOT__ = apiRoot; } catch {}
        setLastInvite({ request, response: body, apiRoot, at: Date.now() });
        setTimeout(injectPanel, 80);
        setTimeout(injectPanel, 350);
      } catch {}
    }
    return response;
  };
}

function installEvents() {
  document.addEventListener('click', async (event) => {
    const copy = event.target.closest('[data-hq-copy-link]');
    if (copy) {
      const ok = await copyText(linkFromInvite(getLastInvite()));
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      setTimeout(() => { copy.textContent = 'Copy link'; }, 1400);
      return;
    }
    const open = event.target.closest('[data-hq-open-link]');
    if (open) {
      const link = linkFromInvite(getLastInvite());
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    const resend = event.target.closest('[data-hq-resend-invite]');
    if (resend) {
      resendInvite(resend);
    }
  });
}

function schedule() {
  [0, 250, 900, 1600].forEach((delay) => setTimeout(injectPanel, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  installFetchCapture();
  installEvents();
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  setInterval(() => { if (isHq()) injectPanel(); }, 2500);
}
