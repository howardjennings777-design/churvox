import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_TESTER_OUTREACH_RUNTIME__';
const ROOT_ID = 'churvox-hq-tester-outreach-root';
const BUTTON_ID = 'churvox-hq-tester-outreach-button';
const STYLE_ID = 'churvox-hq-tester-outreach-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

const state = {
  open: false,
  loading: false,
  saving: false,
  data: null,
  editingId: '',
  form: emptyForm(),
  notice: '',
  noticeTone: 'plain',
  query: '',
};

function emptyForm() {
  return {
    id: '',
    contact_name: '',
    business_name: '',
    email: '',
    trade: '',
    country: '',
    website: '',
    source: 'manual_hq',
    subject: 'Would you test Churvox for 30 days?',
    body: '',
    note: '',
  };
}

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function authToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function headers() {
  const token = authToken();
  return { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiGet(path) {
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include', headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  return body;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_ROOT}${path}`, { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload || {}) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  return body;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function lower(value) { return String(value || '').trim().toLowerCase(); }
function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(item) { return String(item?.id || item?._id || item?.email || ''); }
function dateText(value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-NZ'); }
function statusTone(status) { const text = lower(status); if (/replied|interested|active|converted|feedback|signed_up/.test(text)) return 'good'; if (/not_interested|do_not_contact|archived|failed/.test(text)) return 'bad'; if (/sent/.test(text)) return 'sent'; return 'draft'; }

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{position:relative}
    #${BUTTON_ID} em{margin-left:auto;min-width:20px;height:20px;border-radius:999px;display:inline-grid;place-items:center;background:#f97316;color:#111827;font-size:10px;font-style:normal;font-weight:1000}
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147482000;display:none;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
    #${ROOT_ID}.open{display:block}
    #${ROOT_ID} .htoBackdrop{position:absolute;inset:0;background:rgba(2,6,23,.72);backdrop-filter:blur(5px)}
    #${ROOT_ID} .htoShell{position:absolute;inset:18px 18px 18px max(18px,calc((100vw - 1480px)/2));margin-left:min(250px,18vw);background:#f8fafc;border:1px solid rgba(255,255,255,.18);border-radius:24px;overflow:hidden;box-shadow:0 30px 90px rgba(2,6,23,.45);display:grid;grid-template-rows:auto 1fr}
    #${ROOT_ID} .htoHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px 22px;background:linear-gradient(120deg,#020617,#111827 62%,#ea580c 160%);color:white}
    #${ROOT_ID} .htoHead small{display:block;color:#fdba74;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;font-size:10px}
    #${ROOT_ID} .htoHead h2{margin:5px 0 3px;font-size:25px;letter-spacing:-.045em}
    #${ROOT_ID} .htoHead p{margin:0;color:#cbd5e1;font-size:12px;font-weight:700;max-width:760px}
    #${ROOT_ID} .htoHeadActions{display:flex;gap:8px}
    #${ROOT_ID} button{font:inherit}
    #${ROOT_ID} .htoHead button,#${ROOT_ID} .htoButton{border:0;border-radius:12px;padding:10px 13px;font-weight:950;cursor:pointer}
    #${ROOT_ID} .htoHead button{background:rgba(255,255,255,.12);color:white;border:1px solid rgba(255,255,255,.14)}
    #${ROOT_ID} .htoBody{overflow:auto;padding:14px;display:grid;gap:12px}
    #${ROOT_ID} .htoMetrics{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
    #${ROOT_ID} .htoMetric{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;box-shadow:0 5px 16px rgba(15,23,42,.05)}
    #${ROOT_ID} .htoMetric b{display:block;font-size:21px;letter-spacing:-.04em}
    #${ROOT_ID} .htoMetric span{display:block;margin-top:4px;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
    #${ROOT_ID} .htoNotice{border-radius:14px;padding:11px 13px;font-size:12px;font-weight:850;border:1px solid #cbd5e1;background:white}
    #${ROOT_ID} .htoNotice.good{border-color:#86efac;background:#f0fdf4;color:#166534}
    #${ROOT_ID} .htoNotice.bad{border-color:#fecaca;background:#fef2f2;color:#991b1b}
    #${ROOT_ID} .htoNotice.warn{border-color:#fed7aa;background:#fff7ed;color:#9a3412}
    #${ROOT_ID} .htoGrid{display:grid;grid-template-columns:minmax(360px,.85fr) minmax(500px,1.4fr);gap:12px;align-items:start}
    #${ROOT_ID} .htoCard{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:14px;box-shadow:0 8px 24px rgba(15,23,42,.055)}
    #${ROOT_ID} .htoCardHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:11px}
    #${ROOT_ID} .htoCardHead h3{margin:0;font-size:16px;letter-spacing:-.03em}
    #${ROOT_ID} .htoCardHead p{margin:3px 0 0;color:#64748b;font-size:11px;font-weight:750}
    #${ROOT_ID} .htoPill{border-radius:999px;padding:5px 8px;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;background:#ffedd5;color:#9a3412;white-space:nowrap}
    #${ROOT_ID} .htoForm{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    #${ROOT_ID} label{display:grid;gap:5px}
    #${ROOT_ID} label.wide{grid-column:1/-1}
    #${ROOT_ID} label span{font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.07em;color:#475569}
    #${ROOT_ID} input,#${ROOT_ID} textarea,#${ROOT_ID} select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:11px;padding:9px 10px;background:#fff;color:#0f172a;font:inherit;font-size:12px;outline:none}
    #${ROOT_ID} textarea{min-height:92px;resize:vertical;line-height:1.45}
    #${ROOT_ID} input:focus,#${ROOT_ID} textarea:focus,#${ROOT_ID} select:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.12)}
    #${ROOT_ID} .htoFormActions{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;margin-top:3px}
    #${ROOT_ID} .htoButton{background:#e2e8f0;color:#0f172a}
    #${ROOT_ID} .htoButton.primary{background:#0f172a;color:white}
    #${ROOT_ID} .htoButton.hot{background:#f97316;color:#111827}
    #${ROOT_ID} .htoButton.danger{background:#fee2e2;color:#991b1b}
    #${ROOT_ID} .htoButton:disabled{opacity:.55;cursor:not-allowed}
    #${ROOT_ID} .htoToolbar{display:flex;gap:8px;align-items:center;margin-bottom:10px}
    #${ROOT_ID} .htoToolbar input{flex:1}
    #${ROOT_ID} .htoList{display:grid;gap:7px;max-height:590px;overflow:auto;padding-right:3px}
    #${ROOT_ID} .htoRow{border:1px solid #e2e8f0;border-radius:14px;padding:10px;background:#fff;display:grid;gap:8px}
    #${ROOT_ID} .htoRowTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}
    #${ROOT_ID} .htoRowTop b{display:block;font-size:13px}
    #${ROOT_ID} .htoRowTop span{display:block;color:#64748b;font-size:10px;margin-top:2px;overflow-wrap:anywhere}
    #${ROOT_ID} .htoStatus{border-radius:999px;padding:5px 8px;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;background:#e2e8f0;color:#334155}
    #${ROOT_ID} .htoStatus.good{background:#dcfce7;color:#166534}.htoStatus.bad{background:#fee2e2;color:#991b1b}.htoStatus.sent{background:#dbeafe;color:#1d4ed8}.htoStatus.draft{background:#ffedd5;color:#9a3412}
    #${ROOT_ID} .htoMeta{display:flex;gap:6px;flex-wrap:wrap;color:#475569;font-size:10px;font-weight:750}
    #${ROOT_ID} .htoReply{background:#f8fafc;border-left:3px solid #f97316;border-radius:8px;padding:8px;color:#334155;font-size:11px;line-height:1.4}
    #${ROOT_ID} .htoRowActions{display:flex;gap:6px;flex-wrap:wrap}
    #${ROOT_ID} .htoRowActions button{border:0;border-radius:9px;padding:7px 9px;background:#e2e8f0;color:#0f172a;font-size:10px;font-weight:950;cursor:pointer}
    #${ROOT_ID} .htoRowActions button.send{background:#f97316}.htoRowActions button.good{background:#dcfce7;color:#166534}.htoRowActions button.bad{background:#fee2e2;color:#991b1b}
    #${ROOT_ID} .htoEmpty{border:1px dashed #cbd5e1;border-radius:14px;padding:24px;text-align:center;color:#64748b;font-size:12px;font-weight:800}
    @media(max-width:1100px){#${ROOT_ID} .htoShell{margin-left:10px;inset:10px}#${ROOT_ID} .htoMetrics{grid-template-columns:repeat(4,1fr)}#${ROOT_ID} .htoGrid{grid-template-columns:1fr}#${ROOT_ID} .htoList{max-height:none}}
    @media(max-width:680px){#${ROOT_ID} .htoHead{display:block}#${ROOT_ID} .htoHeadActions{margin-top:10px}#${ROOT_ID} .htoMetrics{grid-template-columns:repeat(2,1fr)}#${ROOT_ID} .htoForm{grid-template-columns:1fr}#${ROOT_ID} label.wide,#${ROOT_ID} .htoFormActions{grid-column:1}.htoRowTop{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function ensureButton() {
  if (!isHqPath()) return;
  const nav = document.querySelector('.hq2Side nav');
  if (!nav || document.getElementById(BUTTON_ID)) return;
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.innerHTML = 'Outreach <em>0</em>';
  button.addEventListener('click', () => openDesk());
  const testerButton = Array.from(nav.querySelectorAll('button')).find((item) => lower(item.textContent).startsWith('testers'));
  if (testerButton?.nextSibling) nav.insertBefore(button, testerButton.nextSibling);
  else nav.appendChild(button);
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('section');
  root.id = ROOT_ID;
  root.innerHTML = '<div class="htoBackdrop" data-hto-close></div><div class="htoShell"><header class="htoHead"></header><div class="htoBody"></div></div>';
  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleInput);
  document.body.appendChild(root);
  return root;
}

function setNotice(message, tone = 'plain') {
  state.notice = message || '';
  state.noticeTone = tone;
  render();
}

async function loadData(silent = false) {
  if (!silent) state.loading = true;
  render();
  try {
    state.data = await apiGet('/api/admin/owner/tester-outreach');
    const badge = document.querySelector(`#${BUTTON_ID} em`);
    if (badge) badge.textContent = String(state.data?.counts?.drafts || 0);
  } catch (error) {
    setNotice(error.message || 'Could not load tester outreach.', 'bad');
  } finally {
    state.loading = false;
    render();
  }
}

function openDesk() {
  state.open = true;
  ensureRoot().classList.add('open');
  document.body.style.overflow = 'hidden';
  render();
  loadData();
}

function closeDesk() {
  state.open = false;
  document.getElementById(ROOT_ID)?.classList.remove('open');
  document.body.style.overflow = '';
}

function formHtml() {
  const form = state.form;
  return `
    <div class="htoForm">
      <label><span>Contact name</span><input data-field="contact_name" value="${esc(form.contact_name)}" placeholder="Optional"></label>
      <label><span>Business</span><input data-field="business_name" value="${esc(form.business_name)}" placeholder="Business name"></label>
      <label><span>Email</span><input data-field="email" type="email" value="${esc(form.email)}" placeholder="owner@business.com"></label>
      <label><span>Trade</span><input data-field="trade" value="${esc(form.trade)}" placeholder="Landscaping, cleaning, plumbing…"></label>
      <label><span>Country</span><input data-field="country" value="${esc(form.country)}" placeholder="NZ, AU, UK, US…"></label>
      <label><span>Website</span><input data-field="website" value="${esc(form.website)}" placeholder="https://"></label>
      <label class="wide"><span>Subject</span><input data-field="subject" value="${esc(form.subject)}"></label>
      <label class="wide"><span>Email body</span><textarea data-field="body" placeholder="Leave blank and Churvox will prepare the standard personal invitation.">${esc(form.body)}</textarea></label>
      <label class="wide"><span>Internal note</span><textarea data-field="note" placeholder="Why this business is a good fit">${esc(form.note)}</textarea></label>
      <div class="htoFormActions">
        <button type="button" class="htoButton" data-action="new-draft">Clear</button>
        <button type="button" class="htoButton primary" data-action="save-draft" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Saving…' : 'Save draft'}</button>
        <button type="button" class="htoButton hot" data-action="approve-send" ${state.saving ? 'disabled' : ''}>Approve &amp; send</button>
      </div>
    </div>`;
}

function rowHtml(prospect) {
  const id = idOf(prospect);
  const status = lower(prospect.status || 'draft');
  const messages = arr(state.data?.messages).filter((message) => String(message.prospect_id || '') === id || lower(message.email) === lower(prospect.email));
  const latestInbound = messages.find((message) => lower(message.direction) === 'inbound');
  return `<article class="htoRow" data-id="${esc(id)}">
    <div class="htoRowTop"><div><b>${esc(prospect.business_name || prospect.contact_name || prospect.display_email || prospect.email || 'Prospect')}</b><span>${esc(prospect.display_email || prospect.email || '')}${prospect.trade ? ` · ${esc(prospect.trade)}` : ''}${prospect.country ? ` · ${esc(prospect.country)}` : ''}</span></div><em class="htoStatus ${statusTone(status)}">${esc(status.replaceAll('_', ' '))}</em></div>
    <div class="htoMeta"><span>30-day tester</span><span>${messages.length} message${messages.length === 1 ? '' : 's'}</span><span>updated ${esc(dateText(prospect.updated_at || prospect.created_at))}</span>${prospect.last_sent_at ? `<span>sent ${esc(dateText(prospect.last_sent_at))}</span>` : ''}</div>
    ${latestInbound?.text || prospect.last_reply_preview ? `<div class="htoReply"><b>Latest reply:</b> ${esc((latestInbound?.text || prospect.last_reply_preview || '').slice(0, 360))}</div>` : ''}
    <div class="htoRowActions">
      <button type="button" data-row-action="edit">Open</button>
      ${status === 'draft' ? '<button type="button" class="send" data-row-action="send">Approve & send</button>' : ''}
      ${!['do_not_contact', 'not_interested', 'archived'].includes(status) ? '<button type="button" class="good" data-row-action="interested">Interested</button><button type="button" class="good" data-row-action="grant">Grant 30 days</button>' : ''}
      ${!['do_not_contact', 'not_interested'].includes(status) ? '<button type="button" class="bad" data-row-action="do-not-contact">Do not contact</button>' : ''}
    </div>
  </article>`;
}

function render() {
  const root = ensureRoot();
  if (!state.open) return;
  const counts = state.data?.counts || {};
  const config = state.data?.config || {};
  const prospects = arr(state.data?.prospects).filter((item) => {
    const query = lower(state.query);
    return !query || JSON.stringify(item).toLowerCase().includes(query);
  });
  root.querySelector('.htoHead').innerHTML = `<div><small>Owner approval desk · email only</small><h2>Tester outreach</h2><p>Prepare personal invitations, approve each send, grant selected businesses 30 days, and keep replies and follow-ups in one place.</p></div><div class="htoHeadActions"><button type="button" data-action="refresh">Refresh</button><button type="button" data-hto-close>Close</button></div>`;
  root.querySelector('.htoBody').innerHTML = `
    <section class="htoMetrics">
      <article class="htoMetric"><b>${Number(counts.total || 0).toLocaleString()}</b><span>Total</span></article>
      <article class="htoMetric"><b>${Number(counts.drafts || 0).toLocaleString()}</b><span>Drafts</span></article>
      <article class="htoMetric"><b>${Number(counts.sent || 0).toLocaleString()}</b><span>Sent</span></article>
      <article class="htoMetric"><b>${Number(counts.replied || 0).toLocaleString()}</b><span>Replied</span></article>
      <article class="htoMetric"><b>${Number(counts.interested || 0).toLocaleString()}</b><span>Interested</span></article>
      <article class="htoMetric"><b>${Number(counts.active || 0).toLocaleString()}</b><span>Active</span></article>
      <article class="htoMetric"><b>${Number(counts.converted || 0).toLocaleString()}</b><span>Converted</span></article>
    </section>
    ${state.notice ? `<div class="htoNotice ${esc(state.noticeTone)}">${esc(state.notice)}</div>` : ''}
    ${config.send_ready === false ? '<div class="htoNotice bad">Postmark sending is not configured on the live backend yet. Drafting still works, but approved sends will fail until the sender token is present.</div>' : ''}
    ${config.reply_capture_ready === false ? '<div class="htoNotice warn">Sending is available, but replies will continue to land in hello@churvox.com until the Postmark inbound webhook and reply address are configured.</div>' : '<div class="htoNotice good">Outbound sending and inbound reply capture are configured.</div>'}
    <section class="htoGrid">
      <article class="htoCard"><header class="htoCardHead"><div><h3>${state.editingId ? 'Edit outreach draft' : 'New tester prospect'}</h3><p>Normal public trial stays 14 days. Selected testers get 30 days.</p></div><span class="htoPill">No phone calls</span></header>${formHtml()}</article>
      <article class="htoCard"><header class="htoCardHead"><div><h3>Outreach pipeline</h3><p>Nothing sends until you press Approve &amp; send.</p></div><span class="htoPill">${prospects.length} shown</span></header><div class="htoToolbar"><input data-query value="${esc(state.query)}" placeholder="Search business, email, trade or country"><button type="button" class="htoButton" data-action="refresh">Refresh</button></div><div class="htoList">${state.loading ? '<div class="htoEmpty">Loading tester outreach…</div>' : prospects.length ? prospects.map(rowHtml).join('') : '<div class="htoEmpty">No tester prospects yet. Add the first business using the form.</div>'}</div></article>
    </section>`;
}

function updateFormFromProspect(prospect) {
  state.editingId = idOf(prospect);
  state.form = {
    id: idOf(prospect),
    contact_name: prospect.contact_name || prospect.name || '',
    business_name: prospect.business_name || '',
    email: prospect.display_email || prospect.email || '',
    trade: prospect.trade || '',
    country: prospect.country || '',
    website: prospect.website || '',
    source: prospect.source || 'manual_hq',
    subject: prospect.subject || 'Would you test Churvox for 30 days?',
    body: prospect.body || '',
    note: prospect.note || '',
  };
  render();
}

async function saveDraft() {
  if (!state.form.email) return setNotice('Enter the business email first.', 'bad');
  state.saving = true;
  render();
  try {
    const result = await apiPost('/api/admin/owner/tester-outreach/draft', { ...state.form, id: state.editingId || state.form.id });
    state.editingId = idOf(result.prospect);
    state.form.id = state.editingId;
    setNotice(result.message || 'Draft saved.', 'good');
    await loadData(true);
    return result.prospect;
  } catch (error) {
    setNotice(error.message || 'Could not save draft.', 'bad');
    return null;
  } finally {
    state.saving = false;
    render();
  }
}

async function approveAndSend(prospect = null) {
  let target = prospect;
  if (!target) target = await saveDraft();
  if (!target) return;
  state.saving = true;
  render();
  try {
    const result = await apiPost('/api/admin/owner/tester-outreach/send', { id: idOf(target), email: target.email, approved: true, subject: target.subject || state.form.subject, body: target.body || state.form.body });
    setNotice(result.message || 'Tester invitation sent.', 'good');
    await loadData(true);
  } catch (error) {
    setNotice(error.message || 'Could not send tester invitation.', 'bad');
  } finally {
    state.saving = false;
    render();
  }
}

async function setStatus(prospect, status) {
  try {
    const result = await apiPost('/api/admin/owner/tester-outreach/status', { id: idOf(prospect), email: prospect.email, status });
    setNotice(result.message || 'Status updated.', status === 'do_not_contact' ? 'warn' : 'good');
    await loadData(true);
  } catch (error) { setNotice(error.message || 'Could not update status.', 'bad'); }
}

async function grantTester(prospect) {
  try {
    const result = await apiPost('/api/admin/owner/tester-intake', {
      email: prospect.display_email || prospect.email,
      display_email: prospect.display_email || prospect.email,
      original_email: prospect.display_email || prospect.email,
      name: prospect.contact_name || '',
      business_name: prospect.business_name || '',
      plan: 'pro',
      pack: 'full_access',
      days: 30,
      note: 'Granted from Tester Outreach after email-only interest',
      send_email: true,
    });
    await setStatus(prospect, result?.user ? 'signed_up' : 'interested');
    setNotice(result.message || '30-day tester access prepared.', 'good');
  } catch (error) { setNotice(error.message || 'Could not grant 30-day tester access.', 'bad'); }
}

function findProspectFromTarget(target) {
  const row = target.closest('.htoRow');
  if (!row) return null;
  return arr(state.data?.prospects).find((item) => idOf(item) === row.dataset.id) || null;
}

async function handleClick(event) {
  if (event.target.closest('[data-hto-close]')) { closeDesk(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'refresh') { await loadData(); return; }
  if (action === 'new-draft') { state.editingId = ''; state.form = emptyForm(); state.notice = ''; render(); return; }
  if (action === 'save-draft') { await saveDraft(); return; }
  if (action === 'approve-send') { await approveAndSend(); return; }
  const rowAction = event.target.closest('[data-row-action]')?.dataset.rowAction;
  if (!rowAction) return;
  const prospect = findProspectFromTarget(event.target);
  if (!prospect) return;
  if (rowAction === 'edit') updateFormFromProspect(prospect);
  if (rowAction === 'send') await approveAndSend(prospect);
  if (rowAction === 'interested') await setStatus(prospect, 'interested');
  if (rowAction === 'grant') await grantTester(prospect);
  if (rowAction === 'do-not-contact') await setStatus(prospect, 'do_not_contact');
}

function handleInput(event) {
  if (event.target.matches('[data-query]')) {
    state.query = event.target.value;
    const cursor = state.query.length;
    render();
    const next = document.querySelector(`#${ROOT_ID} [data-query]`);
    if (next) { next.focus(); try { next.setSelectionRange(cursor, cursor); } catch {} }
    return;
  }
  const field = event.target.dataset.field;
  if (field) state.form[field] = event.target.value;
}

function schedule() {
  if (!isHqPath()) return;
  installStyle();
  ensureRoot();
  [0, 450, 1200, 2600].forEach((delay) => setTimeout(ensureButton, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isHqPath()) ensureButton(); }, 30000);
}

export {};
