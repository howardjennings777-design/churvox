import API_BASE from '../lib/apiBase';

const POPUP_ID = 'churvox-founding-tester-popup';
const STYLE_ID = 'churvox-founding-tester-popup-style';
const STORAGE_KEY = 'churvox:founding-tester-popup:v1';
const OPEN_DELAY_MS = 30000;
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const ENDPOINT = '/api/public/tester-applications';

let openTimer = null;
let popupOpen = false;

function apiUrl(path) {
  const base = String(API_BASE || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...next }));
  } catch {}
}

function isSignedIn() {
  try {
    if (window.__CHURVOX_AUTH_STATE__?.status === 'authenticated') return true;
    return Boolean(localStorage.getItem('token') || localStorage.getItem('authToken'));
  } catch {
    return false;
  }
}

function shouldOffer() {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return false;
  if (isSignedIn() || document.getElementById(POPUP_ID)) return false;
  const state = readState();
  if (state.submittedAt) return false;
  if (state.dismissedAt && Date.now() - Number(state.dismissedAt) < DISMISS_FOR_MS) return false;
  return true;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${POPUP_ID}{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.72);backdrop-filter:blur(10px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #${POPUP_ID}[hidden]{display:none!important}
    #${POPUP_ID} *{box-sizing:border-box}
    #${POPUP_ID} .cftpCard{position:relative;width:min(760px,100%);max-height:min(820px,calc(100vh - 32px));overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:28px;background:linear-gradient(145deg,#111827 0%,#0f172a 58%,#1c1917 100%);box-shadow:0 32px 90px rgba(0,0,0,.42);color:#fff}
    #${POPUP_ID} .cftpGlow{position:absolute;inset:0 0 auto auto;width:310px;height:220px;pointer-events:none;background:radial-gradient(circle at top right,rgba(249,115,22,.34),transparent 68%)}
    #${POPUP_ID} .cftpClose{position:absolute;top:14px;right:14px;z-index:2;width:42px;height:42px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(15,23,42,.72);color:#fff;font-size:25px;line-height:1;cursor:pointer}
    #${POPUP_ID} .cftpLayout{position:relative;display:grid;grid-template-columns:minmax(0,.92fr) minmax(320px,1.08fr);gap:0}
    #${POPUP_ID} .cftpPitch{display:flex;flex-direction:column;justify-content:center;padding:42px 36px 38px}
    #${POPUP_ID} .cftpKicker{display:inline-flex;width:max-content;margin:0 0 18px;padding:7px 11px;border:1px solid rgba(251,146,60,.38);border-radius:999px;background:rgba(249,115,22,.12);color:#fdba74;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
    #${POPUP_ID} h2{margin:0;font-size:clamp(30px,4.2vw,48px);line-height:1.02;letter-spacing:-.045em}
    #${POPUP_ID} h2 span{color:#fb923c}
    #${POPUP_ID} .cftpLead{margin:18px 0 0;color:#dbe4f0;font-size:16px;line-height:1.65}
    #${POPUP_ID} .cftpChecks{display:grid;gap:11px;margin:24px 0 0;padding:0;list-style:none;color:#f8fafc;font-size:14px;font-weight:750}
    #${POPUP_ID} .cftpChecks li{display:flex;gap:9px;align-items:flex-start}
    #${POPUP_ID} .cftpChecks li::before{content:'✓';display:grid;place-items:center;flex:0 0 21px;width:21px;height:21px;margin-top:1px;border-radius:999px;background:#fb923c;color:#111827;font-size:12px;font-weight:1000}
    #${POPUP_ID} .cftpFormWrap{margin:16px;padding:28px;border-radius:22px;background:#fff;color:#111827;box-shadow:0 20px 55px rgba(0,0,0,.2)}
    #${POPUP_ID} .cftpFormWrap h3{margin:0;font-size:22px;letter-spacing:-.025em}
    #${POPUP_ID} .cftpFormIntro{margin:7px 0 20px;color:#64748b;font-size:13px;line-height:1.5}
    #${POPUP_ID} .cftpForm{display:grid;grid-template-columns:1fr 1fr;gap:13px}
    #${POPUP_ID} label{display:grid;gap:6px;color:#334155;font-size:12px;font-weight:900}
    #${POPUP_ID} label.cftpWide{grid-column:1/-1}
    #${POPUP_ID} input,#${POPUP_ID} select{width:100%;min-height:46px;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;background:#fff;color:#0f172a;font:inherit;font-size:15px;font-weight:700;outline:none}
    #${POPUP_ID} input:focus,#${POPUP_ID} select:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.15)}
    #${POPUP_ID} .cftpTrap{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    #${POPUP_ID} .cftpSubmit{grid-column:1/-1;min-height:50px;border:0;border-radius:13px;background:linear-gradient(135deg,#f97316,#fb923c);color:#111827;font-size:15px;font-weight:1000;cursor:pointer;box-shadow:0 12px 28px rgba(249,115,22,.25)}
    #${POPUP_ID} .cftpSubmit:disabled{cursor:wait;opacity:.68}
    #${POPUP_ID} .cftpFine{grid-column:1/-1;margin:0;color:#64748b;font-size:11px;line-height:1.45;text-align:center}
    #${POPUP_ID} .cftpStatus{grid-column:1/-1;margin:0;padding:11px 12px;border-radius:11px;background:#fff7ed;color:#9a3412;font-size:12px;font-weight:850;line-height:1.45}
    #${POPUP_ID} .cftpSuccess{display:grid;place-items:center;min-height:340px;text-align:center;padding:26px}
    #${POPUP_ID} .cftpSuccessMark{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 16px;border-radius:999px;background:#dcfce7;color:#166534;font-size:28px;font-weight:1000}
    #${POPUP_ID} .cftpSuccess h3{font-size:26px;margin:0 0 10px}#${POPUP_ID} .cftpSuccess p{max-width:380px;margin:0;color:#475569;line-height:1.6}
    @media(max-width:760px){#${POPUP_ID}{padding:10px;align-items:end}#${POPUP_ID} .cftpCard{max-height:calc(100vh - 20px);border-radius:24px 24px 18px 18px}#${POPUP_ID} .cftpLayout{grid-template-columns:1fr}#${POPUP_ID} .cftpPitch{padding:34px 24px 12px}#${POPUP_ID} h2{font-size:34px}#${POPUP_ID} .cftpChecks{display:none}#${POPUP_ID} .cftpFormWrap{margin:12px;padding:22px}#${POPUP_ID} .cftpForm{grid-template-columns:1fr}#${POPUP_ID} label.cftpWide,#${POPUP_ID} .cftpSubmit,#${POPUP_ID} .cftpFine,#${POPUP_ID} .cftpStatus{grid-column:1}}
    @media(prefers-reduced-motion:no-preference){#${POPUP_ID} .cftpCard{animation:cftpEnter .28s ease-out both}@keyframes cftpEnter{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}}
  `;
  document.head.appendChild(style);
}

function closePopup(reason = 'dismissed') {
  const popup = document.getElementById(POPUP_ID);
  if (!popup) return;
  popup.remove();
  popupOpen = false;
  document.documentElement.style.removeProperty('overflow');
  if (reason === 'dismissed') writeState({ dismissedAt: Date.now() });
}

function fieldValue(form, name) {
  return String(new FormData(form).get(name) || '').trim();
}

async function submitApplication(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('.cftpSubmit');
  const status = form.querySelector('.cftpStatus');
  const payload = {
    name: fieldValue(form, 'name'),
    business_name: fieldValue(form, 'business_name'),
    trade: fieldValue(form, 'trade'),
    email: fieldValue(form, 'email').toLowerCase(),
    team_size: fieldValue(form, 'team_size'),
    website: fieldValue(form, 'website'),
    source: 'founding_10_homepage_popup',
  };

  if (!payload.name || !payload.business_name || !payload.trade || !payload.email || !payload.team_size) {
    status.hidden = false;
    status.textContent = 'Please complete all five fields.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Sending application…';
  status.hidden = true;

  try {
    const response = await fetch(apiUrl(ENDPOINT), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || 'Application could not be sent.');

    writeState({ submittedAt: Date.now(), dismissedAt: null });
    const formWrap = form.closest('.cftpFormWrap');
    formWrap.innerHTML = `
      <div class="cftpSuccess" role="status" aria-live="polite">
        <div>
          <div class="cftpSuccessMark">✓</div>
          <h3>Your application is in.</h3>
          <p>Thanks for putting your hand up. Howard will review it and contact you by email if one of the 10 tester places is available.</p>
        </div>
      </div>`;
  } catch (error) {
    status.hidden = false;
    status.textContent = error?.message || 'Application could not be sent. Please try again.';
    button.disabled = false;
    button.textContent = 'Apply for a tester place';
  }
}

function openPopup() {
  if (!shouldOffer() || popupOpen) return;
  ensureStyle();
  popupOpen = true;
  document.documentElement.style.setProperty('overflow', 'hidden');

  const popup = document.createElement('section');
  popup.id = POPUP_ID;
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-labelledby', 'cftp-title');
  popup.innerHTML = `
    <article class="cftpCard">
      <div class="cftpGlow"></div>
      <button class="cftpClose" type="button" aria-label="Close tester application">×</button>
      <div class="cftpLayout">
        <section class="cftpPitch">
          <p class="cftpKicker">Only 10 tester places</p>
          <h2>Help shape Churvox. <span>Use it free for 30 days.</span></h2>
          <p class="cftpLead">We’re looking for real service businesses to use Churvox with real jobs and tell us what genuinely helps.</p>
          <ul class="cftpChecks">
            <li>No card, contract or sales calls</li>
            <li>Support handled entirely by email</li>
            <li>You stay in control—nothing auto-sends</li>
          </ul>
        </section>
        <section class="cftpFormWrap">
          <h3 id="cftp-title">Apply for a tester place</h3>
          <p class="cftpFormIntro">It takes under a minute. Applying does not create an account or start a subscription.</p>
          <form class="cftpForm" novalidate>
            <label>Full name<input name="name" autocomplete="name" maxlength="100" placeholder="Your name" required></label>
            <label>Business name<input name="business_name" autocomplete="organization" maxlength="140" placeholder="Business name" required></label>
            <label>Trade<select name="trade" required><option value="">Choose one</option><option>Lawn care</option><option>Landscaping</option><option>Cleaning</option><option>Handyman</option><option>Painting</option><option>Plumbing</option><option>Electrical</option><option>Pest control</option><option>Gardening</option><option>Other service business</option></select></label>
            <label>Team size<select name="team_size" required><option value="">Choose one</option><option value="1">Just me</option><option value="2-5">2–5 people</option><option value="6-10">6–10 people</option><option value="11-25">11–25 people</option><option value="26+">26+ people</option></select></label>
            <label class="cftpWide">Email<input name="email" type="email" inputmode="email" autocomplete="email" maxlength="180" placeholder="you@business.co.nz" required></label>
            <label class="cftpTrap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
            <p class="cftpStatus" role="alert" aria-live="assertive" hidden></p>
            <button class="cftpSubmit" type="submit">Apply for a tester place</button>
            <p class="cftpFine">We’ll only use these details to review your tester application and contact you about Churvox.</p>
          </form>
        </section>
      </div>
    </article>`;

  document.body.appendChild(popup);
  popup.querySelector('.cftpClose')?.addEventListener('click', () => closePopup('dismissed'));
  popup.querySelector('.cftpForm')?.addEventListener('submit', submitApplication);
  popup.addEventListener('click', (event) => {
    if (event.target === popup) closePopup('dismissed');
  });
  popup.querySelector('input[name="name"]')?.focus({ preventScroll: true });
}

function schedulePopup() {
  if (openTimer) window.clearTimeout(openTimer);
  if (window.location.pathname !== '/' && popupOpen) closePopup('route');
  if (!shouldOffer()) return;
  openTimer = window.setTimeout(openPopup, OPEN_DELAY_MS);
}

function handleKeydown(event) {
  if (event.key === 'Escape' && popupOpen) closePopup('dismissed');
}

if (typeof window !== 'undefined' && !window.__CHURVOX_FOUNDING_TESTER_POPUP_RUNTIME__) {
  window.__CHURVOX_FOUNDING_TESTER_POPUP_RUNTIME__ = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedulePopup, { once: true });
  else schedulePopup();
  window.addEventListener('popstate', schedulePopup);
  window.addEventListener('hashchange', schedulePopup);
  document.addEventListener('keydown', handleKeydown);
}
