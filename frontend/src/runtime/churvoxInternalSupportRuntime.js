import API_BASE from '../lib/apiBase';
import { getIndustry, normalizeIndustry } from '../config/churvoxIndustrySystem';
import { loadBusinessSettings } from '../lib/businessSettings';

const STYLE_ID = 'churvox-internal-support-runtime-style';
let busy = false;
let renderSeq = 0;

const css = `
  .cv3InternalSupportPanel { grid-column: 1 / -1 !important; border-color: rgba(243,107,33,.22) !important; background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(255,244,232,.9)) !important; }
  .cv3InternalSupportBody { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,.75fr); gap:16px; padding:0 14px 14px; }
  .cv3InternalSupportForm { display:grid; gap:10px; }
  .cv3InternalSupportForm label { display:grid; gap:6px; font-size:11px; font-weight:1000; letter-spacing:.12em; text-transform:uppercase; color:#5f6a63; }
  .cv3InternalSupportForm input,.cv3InternalSupportForm select,.cv3InternalSupportForm textarea { width:100%; border:1px solid rgba(16,21,19,.12); border-radius:16px; background:#fff; color:#101513; padding:12px; font-size:14px; font-weight:850; outline:0; }
  .cv3InternalSupportForm textarea { min-height:120px; resize:vertical; }
  .cv3InternalSupportActions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .cv3InternalSupportActions button { border:0; border-radius:999px; padding:11px 14px; background:#101513; color:#fff; font-size:12px; font-weight:1000; cursor:pointer; }
  .cv3InternalSupportActions span { color:#52605a; font-size:12px; font-weight:850; }
  .cv3InternalSupportSide { border:1px solid rgba(16,21,19,.08); border-radius:22px; background:rgba(255,255,255,.74); padding:14px; color:#52605a; font-size:13px; font-weight:850; line-height:1.5; }
  .cv3InternalSupportSide b { display:block; color:#101513; font-size:18px; font-weight:1000; letter-spacing:-.04em; margin-bottom:6px; }
  .cv3SupportTicketList { display:grid; gap:8px; margin-top:12px; }
  .cv3SupportTicketList article { border:1px solid rgba(16,21,19,.08); border-radius:16px; background:#fff; padding:10px; }
  .cv3SupportTicketList strong { display:block; color:#101513; font-size:12px; font-weight:1000; }
  .cv3SupportTicketList small { display:block; margin-top:3px; color:#66716b; font-size:11px; font-weight:850; }
  .cv3SupportMailtoKilled,
  .cv3LegacySupportContactKilled { display:none !important; }
  @media(max-width:780px){.cv3InternalSupportBody{grid-template-columns:1fr}}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) style.textContent = css;
}

function isOwnerApp() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return path === '/dashboard' || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
}
function isSupportPage() {
  const hash = (window.location.hash || '').toLowerCase();
  const title = document.querySelector('.cv3TopCopy h1')?.textContent || '';
  return hash.includes('support') || hash.includes('help') || /help|support/i.test(title);
}
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function settings() { return loadBusinessSettings(null); }
function industryKey() { const s = settings(); return normalizeIndustry(s.industry_mode || s.trade_industry_type); }
function headers() { const auth = token(); return { Accept:'application/json', 'Content-Type':'application/json', ...(auth ? { Authorization:`Bearer ${auth}` } : {}) }; }
function host() { return String(API_BASE || '').replace(/\/$/, ''); }
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char])); }

async function getTickets() {
  const res = await fetch(`${host()}/api/support/tickets`, { credentials:'include', headers:headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) return [];
  return Array.isArray(body.tickets) ? body.tickets : Array.isArray(body.items) ? body.items : [];
}
async function sendTicket(payload) {
  const res = await fetch(`${host()}/api/support/tickets`, { method:'POST', credentials:'include', headers:headers(), body:JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.message || body?.error || 'Could not save support ticket');
  return body;
}

function pageRoot() {
  return document.querySelector('.cv3Page');
}

function removeDuplicateSupportPanels() {
  const panels = Array.from(document.querySelectorAll('.cv3InternalSupportPanel'));
  panels.slice(1).forEach((panel) => panel.remove());
  return panels[0] || null;
}

function removeLegacyContactPanel() {
  const page = pageRoot();
  if (!page) return;
  page.querySelectorAll('.cv3Panel').forEach((panel) => {
    if (panel.classList.contains('cv3InternalSupportPanel')) return;
    const text = (panel.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const isOldContact = text.includes('need help?') && (text.includes('email support') || text.includes('hello@churvox.com'));
    const isOldContactTitle = text.startsWith('support contact') || (text.includes('contact') && text.includes('email hello@churvox.com'));
    if (isOldContact || isOldContactTitle) {
      panel.classList.add('cv3LegacySupportContactKilled');
      panel.remove();
    }
  });
}

function killMailtoLinks() {
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    a.classList.add('cv3SupportMailtoKilled');
    a.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('button,a').forEach((node) => {
    const text = (node.textContent || '').toLowerCase();
    const href = (node.getAttribute?.('href') || '').toLowerCase();
    if (href.includes('mailto:') || text.includes('email support') || text.includes('hello@churvox.com')) {
      node.classList.add('cv3SupportMailtoKilled');
      node.setAttribute?.('aria-hidden', 'true');
    }
  });
}

function panelHtml(industry, tickets = []) {
  const ticketRows = tickets.slice(0, 4).map((ticket) => `<article><strong>${escapeHtml(ticket.subject || 'Support ticket')}</strong><small>${escapeHtml(ticket.status || 'open')} · ${escapeHtml(ticket.category || 'General')} · ${escapeHtml(ticket.created_at || '')}</small></article>`).join('');
  return `
    <header><div><small>internal support</small><h3>Send support inside Churvox</h3></div></header>
    <div class="cv3InternalSupportBody">
      <form class="cv3InternalSupportForm">
        <label><span>Category</span><select name="category"><option>Setup help</option><option>Bug / something broken</option><option>Billing / plan</option><option>Industry wording</option><option>Feature request</option><option>Other</option></select></label>
        <label><span>Priority</span><select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
        <label><span>Subject</span><input name="subject" placeholder="What do you need help with?" required /></label>
        <label><span>Message</span><textarea name="message" placeholder="Tell Churvox what happened, what page you were on, and what you expected." required></textarea></label>
        <div class="cv3InternalSupportActions"><button type="submit">Send inside Churvox</button><span class="cv3InternalSupportStatus">No email app will open.</span></div>
      </form>
      <aside class="cv3InternalSupportSide"><b>${escapeHtml(industry.title)} support context</b>This ticket is saved inside Churvox with your business type, current page and account context. Support can be handled internally instead of sending the owner to their email app.<div class="cv3SupportTicketList">${ticketRows || '<article><strong>No previous support tickets</strong><small>Tickets you send will appear here.</small></article>'}</div></aside>
    </div>`;
}

async function renderPanel() {
  if (!isOwnerApp()) return;
  ensureStyle();
  if (!isSupportPage()) {
    document.querySelectorAll('.cv3InternalSupportPanel').forEach((panel) => panel.remove());
    return;
  }

  const seq = ++renderSeq;
  killMailtoLinks();
  removeLegacyContactPanel();
  removeDuplicateSupportPanels();

  const page = pageRoot();
  const hero = page?.querySelector('.cv3Hero');
  if (!page || !hero) return;
  const industry = getIndustry(industryKey());
  const tickets = await getTickets().catch(() => []);
  if (seq !== renderSeq) return;

  removeLegacyContactPanel();
  let panel = removeDuplicateSupportPanels();
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'cv3Panel cv3InternalSupportPanel span12';
    hero.insertAdjacentElement('afterend', panel);
  }
  panel.innerHTML = panelHtml(industry, tickets);
  const form = panel.querySelector('form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const status = panel.querySelector('.cv3InternalSupportStatus');
    const data = new FormData(form);
    try {
      status.textContent = 'Saving support ticket...';
      await sendTicket({
        category: data.get('category'),
        priority: data.get('priority'),
        subject: data.get('subject'),
        message: data.get('message'),
        page: window.location.pathname + window.location.hash,
        industry: industryKey(),
      });
      status.textContent = 'Saved inside Churvox. No external email opened.';
      form.reset();
      schedule(500);
    } catch (error) {
      status.textContent = error?.message || 'Could not save support ticket.';
    } finally {
      busy = false;
    }
  });
}

function schedule(delay = 120) { setTimeout(renderPanel, delay); }

if (typeof window !== 'undefined' && !window.__CHURVOX_INTERNAL_SUPPORT_RUNTIME__) {
  window.__CHURVOX_INTERNAL_SUPPORT_RUNTIME__ = true;
  [200, 800, 1800, 3400].forEach(schedule);
  window.addEventListener('load', () => schedule(250));
  window.addEventListener('hashchange', () => [80, 260, 900].forEach(schedule));
  window.addEventListener('popstate', () => [80, 260, 900].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => schedule(300));
}

export {};
