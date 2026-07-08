const STYLE_ID = 'churvox-messages-page-polish-style';
const FLAG = '__CHURVOX_MESSAGES_PAGE_POLISH_RUNTIME__';

const css = `
  .cv3Product.cvxMessagesPolished .cv3Nav {
    position: sticky !important;
    top: 84px !important;
    margin: 0 !important;
    padding: 12px 18px !important;
    gap: 9px !important;
    background: linear-gradient(180deg, rgba(255,253,248,.94), rgba(246,240,231,.9)) !important;
    border-bottom: 1px solid rgba(16,21,19,.08) !important;
    box-shadow: 0 14px 34px rgba(37,28,17,.06) !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Nav button {
    min-width: 94px !important;
    min-height: 48px !important;
    border-radius: 999px !important;
    padding: 9px 13px !important;
    display: inline-grid !important;
    align-content: center !important;
    background: rgba(255,255,255,.58) !important;
    border: 1px solid rgba(16,21,19,.08) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5) !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Nav button.active {
    color: #fff !important;
    background: linear-gradient(135deg, #101513, #2b332e 72%, #f36b21 220%) !important;
    box-shadow: 0 13px 28px rgba(16,21,19,.16) !important;
    transform: translateY(-1px) !important;
  }

  .cv3Product.cvxMessagesPolished .cv3Hero {
    min-height: 138px !important;
    grid-template-columns: minmax(0, .95fr) minmax(420px, .72fr) !important;
    border-radius: 30px !important;
    padding: 20px !important;
    background:
      radial-gradient(circle at 98% 0%, rgba(243,107,33,.13), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.97), rgba(255,248,239,.86)) !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Hero h2 {
    max-width: 650px !important;
    font-size: clamp(30px, 3.15vw, 50px) !important;
    line-height: .95 !important;
    letter-spacing: -.075em !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Hero p {
    max-width: 620px !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }
  .cv3Product.cvxMessagesPolished .cv3HeroStats {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 9px !important;
    align-self: stretch !important;
  }
  .cv3Product.cvxMessagesPolished .cv3HeroStats span {
    min-height: 86px !important;
    border-radius: 22px !important;
    background: rgba(255,255,255,.82) !important;
  }
  .cv3Product.cvxMessagesPolished .cv3HeroStats b {
    font-size: 28px !important;
  }

  .cvxMessageBoardNote {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    border: 1px solid rgba(243,107,33,.18);
    border-radius: 26px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(255,255,255,.86), rgba(255,245,235,.8));
    box-shadow: 0 16px 38px rgba(37,28,17,.07);
  }
  .cvxMessageBoardNote b {
    display: block;
    font-size: 18px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.045em;
    color: #101513;
  }
  .cvxMessageBoardNote span {
    display: block;
    margin-top: 5px;
    color: #66736d;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 820;
  }
  .cvxMessageBoardNote em {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 9px 12px;
    background: #101513;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 1000;
    white-space: nowrap;
  }

  .cv3Product.cvxMessagesPolished .cv3Toolbar {
    padding: 0 !important;
    margin-top: -2px !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Toolbar button {
    min-height: 42px !important;
    border-radius: 999px !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Toolbar button:nth-child(2) {
    background: #101513 !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Panel {
    min-height: 300px !important;
    border-radius: 28px !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Panel:nth-of-type(3) {
    background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,246,236,.78)) !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Panel h3 {
    font-size: 17px !important;
  }
  .cv3Product.cvxMessagesPolished .cv3Row {
    min-height: 70px !important;
    border-radius: 20px !important;
  }

  @media (max-width: 980px) {
    .cv3Product.cvxMessagesPolished .cv3Hero { grid-template-columns: 1fr !important; }
    .cv3Product.cvxMessagesPolished .cv3HeroStats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  }
  @media (max-width: 720px) {
    .cv3Product.cvxMessagesPolished .cv3Hero h2 { font-size: 38px !important; }
    .cvxMessageBoardNote { grid-template-columns: 1fr; }
    .cvxMessageBoardNote em { justify-self: start; }
  }
`;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase(); }
function isMessagesPage() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  const hash = (window.location.hash || '').toLowerCase();
  if (!(path === '/dashboard' || path.startsWith('/dashboard'))) return false;
  if (hash.includes('messages')) return true;
  const topTitle = key(document.querySelector('.cv3TopCopy h1')?.textContent);
  return topTitle === 'messages';
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

function numberFrom(text) {
  const match = clean(text).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function visibleRows(panel) {
  return Array.from(panel?.querySelectorAll('.cv3Row') || []);
}

function panels() {
  return Array.from(document.querySelectorAll('.cv3Panel'));
}

function findPanelByTitle(title) {
  const needle = key(title);
  return panels().find((panel) => key(panel.querySelector('h3')?.textContent).includes(needle));
}

function collectCounts() {
  const heroStats = Array.from(document.querySelectorAll('.cv3HeroStats span'));
  const total = numberFrom(heroStats.find((node) => key(node.textContent).includes('message'))?.querySelector('b')?.textContent || heroStats[0]?.querySelector('b')?.textContent || '0');
  const drafts = numberFrom(heroStats.find((node) => key(node.textContent).includes('draft'))?.querySelector('b')?.textContent || heroStats[1]?.querySelector('b')?.textContent || '0');
  const workerPanel = findPanelByTitle('worker messages');
  const clientPanel = findPanelByTitle('client messages');
  const workerRows = visibleRows(workerPanel);
  const clientRows = visibleRows(clientPanel);
  const unread = [...workerRows, ...clientRows].filter((row) => /unread|new|reply/i.test(row.textContent || '')).length;
  return {
    total: total || workerRows.length + clientRows.length,
    drafts: drafts || 0,
    worker: workerRows.length,
    client: clientRows.length,
    unread,
  };
}

function updateHero() {
  const hero = document.querySelector('.cv3Hero');
  if (!hero) return;
  const kicker = hero.querySelector(':scope > div:first-child small');
  const heading = hero.querySelector('h2');
  const copy = hero.querySelector('p');
  if (kicker) kicker.textContent = 'Inbox';
  if (heading) heading.textContent = 'Messages that need an answer.';
  if (copy) copy.textContent = 'Worker notes and customer replies stay attached to the right job, client and owner decision.';
  const stats = hero.querySelector('.cv3HeroStats');
  if (stats) {
    const c = collectCounts();
    stats.innerHTML = `
      <span><b>${c.total}</b><small>messages</small></span>
      <span><b>${c.unread}</b><small>unread</small></span>
      <span><b>${c.drafts}</b><small>draft replies</small></span>
      <span><b>${c.worker + c.client}</b><small>linked threads</small></span>
    `;
  }
}

function updatePanels() {
  const worker = findPanelByTitle('worker messages');
  const client = findPanelByTitle('client messages');
  const drafted = findPanelByTitle('drafted reply');
  if (worker) {
    const small = worker.querySelector('header small');
    const h3 = worker.querySelector('h3');
    if (small) small.textContent = 'from the field';
    if (h3) h3.textContent = 'Worker inbox';
  }
  if (client) {
    const small = client.querySelector('header small');
    const h3 = client.querySelector('h3');
    if (small) small.textContent = 'customers';
    if (h3) h3.textContent = 'Customer inbox';
  }
  if (drafted) {
    const small = drafted.querySelector('header small');
    const h3 = drafted.querySelector('h3');
    if (small) small.textContent = 'reply ready';
    if (h3) h3.textContent = 'Owner reply';
  }
}

function insertBoardNote() {
  const page = document.querySelector('.cv3Page');
  if (!page || page.querySelector('.cvxMessageBoardNote')) return;
  const toolbar = page.querySelector('.cv3Toolbar');
  if (!toolbar) return;
  const note = document.createElement('section');
  note.className = 'cvxMessageBoardNote';
  note.innerHTML = `<div><b>Message board, not a dumping ground.</b><span>Open a message, reply if needed, or turn it into an owner check. Counts stay focused on this page only.</span></div><em>Reply · delete · review</em>`;
  toolbar.insertAdjacentElement('afterend', note);
}

function run() {
  if (!isMessagesPage()) {
    document.querySelector('.cv3Product')?.classList.remove('cvxMessagesPolished');
    return;
  }
  ensureStyle();
  document.querySelector('.cv3Product')?.classList.add('cvxMessagesPolished');
  updateHero();
  updatePanels();
  insertBoardNote();
}

function schedule(delay = 100) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [120, 500, 1200, 2600].forEach(schedule);
  window.addEventListener('load', () => schedule(180));
  window.addEventListener('hashchange', () => [80, 300, 900].forEach(schedule));
  window.addEventListener('popstate', () => [80, 300, 900].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [120, 700].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [120, 700].forEach(schedule));
  document.addEventListener('click', () => schedule(160), true);
}

export {};
