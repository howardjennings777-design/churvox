import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-hq-support-tickets-style';
let installed = false;
let lastSig = '';

const css = `
  .aomSupportTicketsCard { margin: 0 0 16px; border: 1px solid rgba(243,107,33,.22); border-radius: 26px; background: linear-gradient(135deg, rgba(255,244,232,.96), rgba(255,255,255,.92)); color:#101513; padding:16px; box-shadow:0 18px 45px rgba(16,21,19,.07); }
  .aomSupportTicketsCard header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
  .aomSupportTicketsCard small { display:inline-flex; border-radius:999px; padding:5px 8px; background:rgba(243,107,33,.13); color:#a1430a; font-size:10px; font-weight:1000; letter-spacing:.1em; text-transform:uppercase; }
  .aomSupportTicketsCard h3 { margin:5px 0 0; font-size:clamp(22px,3vw,36px); line-height:.95; letter-spacing:-.06em; font-weight:1000; }
  .aomSupportTicketsCard em { border-radius:999px; padding:8px 10px; background:#101513; color:#fff; font-style:normal; font-size:12px; font-weight:1000; }
  .aomSupportTicketsList { display:grid; gap:8px; }
  .aomSupportTicketsList article { border:1px solid rgba(16,21,19,.08); border-radius:18px; background:rgba(255,255,255,.84); padding:12px; }
  .aomSupportTicketsList b { display:block; color:#101513; font-size:13px; font-weight:1000; }
  .aomSupportTicketsList span { display:block; margin-top:4px; color:#5e6962; font-size:12px; font-weight:850; line-height:1.4; }
  .aomSupportTicketsList i { display:inline-flex; margin-top:8px; border-radius:999px; padding:5px 7px; background:rgba(16,21,19,.08); color:#364039; font-style:normal; font-size:10px; font-weight:1000; letter-spacing:.06em; text-transform:uppercase; }
`;
function isHq() { if (typeof window === 'undefined') return false; const path = window.location.pathname || ''; return ['/admin','/churvox-hq','/admin/hq','/owner/dashboard','/platform-dashboard','/app-owner'].includes(path); }
function ensureStyle() { if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return; const style = document.createElement('style'); style.id = STYLE_ID; style.textContent = css; document.head.appendChild(style); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function headers() { const auth = token(); return { Accept:'application/json', ...(auth ? { Authorization:`Bearer ${auth}` } : {}) }; }
function host() { return String(API_BASE || '').replace(/\/$/, ''); }
function escapeHtml(value) { return String(value || '').replace(/[&<>\"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char])); }
async function fetchTickets() { const res = await fetch(`${host()}/api/admin/owner/support-tickets`, { credentials:'include', headers:headers() }); const body = await res.json().catch(() => ({})); if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.message || body?.error || `Support tickets failed ${res.status}`); return body; }
function anchor() { return document.querySelector('.aomMain .aomHero') || document.querySelector('.aomMain'); }
function dateText(value) { try { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-NZ'); } catch { return ''; } }
function render(body, error = '') {
  if (!isHq()) return;
  ensureStyle();
  const a = anchor();
  if (!a) return;
  const tickets = Array.isArray(body?.tickets) ? body.tickets : Array.isArray(body?.items) ? body.items : [];
  const openCount = error ? '—' : Number(body?.open_count ?? tickets.filter((t) => /open|new|waiting|needs/i.test(String(t.status || 'open'))).length);
  const sig = error ? `error:${error}` : `${openCount}|${tickets.length}|${tickets[0]?.id || tickets[0]?._id || tickets[0]?.created_at || ''}`;
  if (sig === lastSig && document.querySelector('.aomSupportTicketsCard')) return;
  lastSig = sig;
  let card = document.querySelector('.aomSupportTicketsCard');
  if (!card) { card = document.createElement('section'); card.className = 'aomSupportTicketsCard'; a.insertAdjacentElement('afterend', card); }
  const rows = error ? `<article><b>Support endpoint not connected yet</b><span>${escapeHtml(error)}</span><i>offline</i></article>` : (tickets.slice(0, 5).map((ticket) => `<article><b>${escapeHtml(ticket.subject || 'Support ticket')}</b><span>${escapeHtml(ticket.business_name || ticket.user_email || 'Unknown account')} · ${escapeHtml(ticket.category || 'General')} · ${dateText(ticket.created_at)}</span><span>${escapeHtml(ticket.message || '').slice(0, 180)}</span><i>${escapeHtml(ticket.status || 'open')}</i></article>`).join('') || `<article><b>No internal support tickets yet</b><span>When a customer uses Help inside Churvox, the ticket appears here.</span><i>clear</i></article>`);
  card.innerHTML = `<header><div><small>internal support</small><h3>Support tickets</h3></div><em>${openCount} open</em></header><div class="aomSupportTicketsList">${rows}</div>`;
}
async function run() { if (!isHq()) return; try { render(await fetchTickets()); } catch (error) { render(null, error?.message || 'Support tickets endpoint failed'); } }
function schedule(delay = 200) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !installed) { installed = true; [400, 1400, 3200].forEach(schedule); window.addEventListener('load', () => schedule(300)); window.addEventListener('hashchange', () => schedule(300)); window.addEventListener('popstate', () => schedule(300)); setInterval(() => { if (isHq()) run(); }, 30000); }
export {};
