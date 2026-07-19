import API_BASE from '../lib/apiBase';

const POPUP_ID = 'churvox-founding-tester-popup';
const STYLE_ID = 'churvox-founding-tester-popup-style';
const STORAGE_KEY = 'churvox:founding-tester-popup:v2';
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
    #${POPUP_ID}{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(2,6,23,.78);backdrop-filter:blur(12px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #${POPUP_ID}[hidden]{display:none!important}
    #${POPUP_ID} *{box-sizing:border-box}
    #${POPUP_ID} .cftpCard{position:relative;isolation:isolate;width:min(920px,100%);max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:28px;background:#0f172a;box-shadow:0 34px 110px rgba(0,0,0,.52);color:#fff}
    #${POPUP_ID} .cftpGlow{position:absolute;z-index:-1;inset:0 auto auto 0;width:55%;height:100%;pointer-events:none;background:radial-gradient(circle at 20% 18%,rgba(249,115,22,.24),transparent 48%),linear-gradient(145deg,#111827 0%,#0b1220 100%)}
    #${POPUP_ID} .cftpClose{position:absolute;top:18px;right:18px;z-index:10;display:grid;place-items:center;width:42px;height:42px;padding:0;border:1px solid #dbe3ec;border-radius:999px;background:#fff;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;box-shadow:0 8px 24px rgba(15,23,42,.18);font-size:25px;font-weight:500;line-height:1;cursor:pointer}
    #${POPUP_ID} .cftpClose:hover{transform:translateY(-1px);background:#f8fafc}
    #${POPUP_ID} .cftpLayout{position:relative;display:grid;grid-template-columns:minmax(0,.96fr) minmax(390px,1.04fr);min-height:520px}
    #${POPUP_ID} .cftpPitch{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;padding:52px 44px 46px;border-right:1px solid rgba(255,255,255,.08)}
    #${POPUP_ID} .cftpKicker{display:inline-flex!important;width:max-content!important;margin:0 0 20px!important;padding:8px 12px!important;border:1px solid rgba(251,146,60,.52)!important;border-radius:999px!important;background:rgba(249,115,22,.16)!important;color:#fed7aa!important;-webkit-text-fill-color:#fed7aa!important;font-size:11px!important;font-weight:950!important;line-height:1.2!important;letter-spacing:.11em!important;text-transform:uppercase!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpPitch h2{display:block!important;max-width:390px;margin:0!important;padding:0!important;background:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;font-size:clamp(34px,4vw,48px)!important;font-weight:950!important;line-height:1.04!important;letter-spacing:-.045em!important;text-shadow:none!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpPitch h2 span{display:inline!important;background:none!important;color:#fb923c!important;-webkit-text-fill-color:#fb923c!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpLead{display:block!important;max-width:390px;margin:19px 0 0!important;padding:0!important;background:none!important;color:#dbe4f0!important;-webkit-text-fill-color:#dbe4f0!important;font-size:16px!important;font-weight:600!important;line-height:1.62!important;text-shadow:none!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpChecks{display:grid!important;gap:12px!important;margin:27px 0 0!important;padding:0!important;list-style:none!important;background:none!important;color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important;font-size:14px!important;font-weight:800!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpChecks li{display:flex!important;gap:10px!important;align-items:flex-start!important;margin:0!important;padding:0!important;background:none!important;color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important;line-height:1.45!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpChecks li::before{content:'✓';display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;margin-top:0;border-radius:999px;background:#fb923c;color:#111827;-webkit-text-fill-color:#111827;font-size:12px;font-weight:1000}
    #${POPUP_ID} .cftpFormWrap{position:relative;z-index:2;margin:18px;padding:32px 30px 28px;border:1px solid #eef2f7;border-radius:22px;background:#fff;color:#111827;box-shadow:0 24px 64px rgba(0,0,0,.24)}
    #${POPUP_ID} .cftpFormWrap h3{display:block!important;max-width:calc(100% - 48px);margin:0!important;background:none!important;color:#111827!important;-webkit-text-fill-color:#111827!important;font-size:24px!important;font-weight:900!important;line-height:1.2!important;letter-spacing:-.025em!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpFormIntro{display:block!important;margin:8px 0 22px!important;background:none!important;color:#64748b!important;-webkit-text-fill-color:#64748b!important;font-size:13px!important;font-weight:500!important;line-height:1.5!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} .cftpForm{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    #${POPUP_ID} label{display:grid!important;gap:7px!important;margin:0!important;background:none!important;color:#334155!important;-webkit-text-fill-color:#334155!important;font-size:12px!important;font-weight:900!important;line-height:1.25!important;opacity:1!important;visibility:visible!important}
    #${POPUP_ID} label.cftpWide{grid-column:1/-1}
    #${POPUP_ID} input,#${POPUP_ID} select{display:block!important;width:100%!important;min-height:48px!important;margin:0!important;border:1px solid #cbd5e1!important;border-radius:12px!important;padding:10px 12px!important;background:#fff!important;background-image:none!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font:inherit!important;font-size:15px!important;font-weight:700!important;line-height:1.2!important;opacity:1!important;visibility:visible!important;outline:none!important;box-shadow:none}
    #${POPUP_ID} input::placeholder{color:#64748b!important;-webkit-text-fill-color:#64748b!important;opacity:1!important}
    #${POPUP_ID} input:focus,#${POPUP_ID} select:focus{border-color:#f97316!important;box-shadow:0 0 0 3px rgba(249,115,22,.16)!important}
    #${POPUP_ID} .cftpTrap{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    #${POPUP_ID} .cftpSubmit{grid-column:1/-1;min-height:52px;border:0;border-radius:13px;background:linear-gradient(135deg,#f97316,#fb923c);color:#111827!important;-webkit-text-fill-color:#111827!important;font-size:15px;font-weight:1000;cursor:pointer;box-shadow:0 12px 28px rgba(249,115,22,.25)}
    #${POPUP_ID} .cftpSubmit:hover{filter:brightness(1.03);transform:translateY(-1px)}
    #${POPUP_ID} .cftpSubmit:disabled{cursor:wait;opacity:.68;transform:none}
    #${POPUP_ID} .cftpFine{grid-column:1/-1;margin:0!important;color:#64748b!important;-webkit-text-fill-color:#64748b!important;font-size:11px!important;line-height:1.45!important;text-align:center!important}
    #${POPUP_ID} .cftpStatus{grid-column:1/-1;margin:0!important;padding:11px 12px!important;border-radius:11px!important;background:#fff7ed!important;color:#9a3412!important;-webkit-text-fill-color:#9a3412!important;font-size:12px!important;font-weight:850!important;line-height:1.45!important}
    #${POPUP_ID} .cftpSuccess{display:grid;place-items:center;min-height:340px;text-align:center;padding:26px}
    #${POPUP_ID} .cftpSuccessMark{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 16px;border-radius:999px;background:#dcfce7;color:#166534;-webkit-text-fill-color:#166534;font-size:28px;font-weight:1000}
    #${POPUP_ID} .cftpSuccess h3{max-width:none!important;font-size:26px!important;margin:0 0 10px!important}#${POPUP_ID} .cftpSuccess p{max-width:380px;margin:0;color:#475569!important;-webkit-text-fill-color:#475569!important;line-height:1.6}
    @media(max-width:820px){#${POPUP_ID}{padding:14px;align-items:center}#${POPUP_ID} .cftpCard{max-height:calc(100vh - 28px);border-radius:24px}#${POPUP_ID} .cftpLayout{grid-template-columns:1fr;min-height:0}#${POPUP_ID} .cftpGlow{width:100%;height:42%}#${POPUP_ID} .cftpPitch{padding:38px 28px 22px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}#${POPUP_ID} .cftpPitch h2{max-width:620px;font-size:34px!important}#${POPUP_ID} .cftpLead{max-width:620px;margin-top:13px!important;font-size:14px!important}#${POPUP_ID} .cftpChecks{display:none!important}#${POPUP_ID} .cftpFormWrap{margin:12px;padding:26px 22px 22px}#${POPUP_ID} .cftpForm{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){#${POPUP_ID}{padding:8px;align-items:end}#${POPUP_ID} .cftpCard{max-height:calc(100vh - 16px);border-radius:22px 22px 16px 16px}#${POPUP_ID} .cftpClose{top:12px;right:12px;width:38px;height:38px}#${POPUP_ID} .cftpPitch{padding:28px 20px 14px}#${POPUP_ID} .cftpKicker{margin-bottom:12px!important}#${POPUP_ID} .cftpPitch h2{font-size:29px!important;line-height:1.06!important}#${POPUP_ID} .cftpLead{display:none!important}#${POPUP_ID} .cftpFormWrap{margin:9px;padding:22px 16px 18px;border-radius:18px}#${POPUP_ID} .cftpFormWrap h3{font-size:21px!important}#${POPUP_ID} .cftpFormIntro{margin-bottom:16px!important}#${POPUP_ID} .cftpForm{grid-template-columns:1fr;gap:11px}#${POPUP_ID} label.cftpWide,#${POPUP_ID} .cftpSubmit,#${POPUP_ID} .cftpFine,#${POPUP_ID} .cftpStatus{grid-column:1}}
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
