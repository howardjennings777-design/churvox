const CONTROL_STYLE_ID = 'option-f-control-page-runtime-style';
const CONTROL_LAYER_CLASS = 'optionFControlDepth';

const pages = {
  xero: {
    title: 'Accounting sync control',
    intro: 'Draft invoice sync only. Churvox prepares the queue and keeps the owner decision in Command.',
    stats: [
      ['Connected', 'Xero', 'Tenant ready'],
      ['5', 'drafts queued', 'No auto-send'],
      ['0', 'tax files', 'Locked off'],
      ['0', 'payout files', 'Locked off'],
    ],
    sections: [
      {
        title: 'Draft Sync Queue',
        rows: [
          ['INV-1042', 'Belmont Villas', '$420', '3 photos + note', 'Waiting in Command'],
          ['INV-1041', 'Petone Units', '$180', 'Worker notes', 'Ready after owner check'],
          ['INV-1038', 'Naenae Dairy', '$120', 'Site notes', 'Not synced'],
          ['INV-1034', 'Mere H.', '$65', '2 photos', 'Synced'],
        ],
      },
      {
        title: 'Sync Rules',
        rows: [
          ['Draft invoices only', 'Invoices are prepared as drafts before accounting sync.', 'Locked'],
          ['Owner-approved sync', 'Approval and sync decisions remain in Command.', 'Locked'],
          ['No tax filing', 'Churvox does not submit tax returns or filings.', 'Locked'],
          ['No payout files', 'Churvox does not create bank payout files.', 'Locked'],
        ],
      },
      {
        title: 'Activity Log',
        rows: [
          ['Today 8:10', 'Belmont draft prepared from job proof.', 'Queued'],
          ['Today 7:42', 'Petone invoice checked against worker note.', 'Ready'],
          ['Yesterday', 'Mere H. invoice marked synced after accounting status refresh.', 'Synced'],
        ],
      },
    ],
  },
  settings: {
    title: 'Business control centre',
    intro: 'Real controls for the business, team, messages, imports and exports.',
    stats: [
      ['NZ', 'region', 'GST ready'],
      ['15%', 'GST', 'Editable'],
      ['On', 'notifications', 'Worker + owner'],
      ['CSV', 'imports', 'Clients and team'],
    ],
    sections: [
      {
        title: 'Business Profile',
        rows: [
          ['Business name', 'Churvox business', 'Shown on quotes and invoices'],
          ['Public email', 'hello@churvox.com', 'Replies and help'],
          ['Logo', 'Uploaded', 'Used across documents'],
          ['Country', 'New Zealand', 'GST and date format'],
        ],
      },
      {
        title: 'Operating Rules',
        rows: [
          ['Default repeat', 'Fortnightly', 'Weekly, fortnightly, monthly or custom'],
          ['Default billing', 'Fixed + extras', 'Can be changed per job'],
          ['Proof requirement', 'Photos + notes', 'Shown before invoice draft'],
          ['Issue handling', 'Waits in Command', 'No send-to-Command button needed'],
        ],
      },
      {
        title: 'Data + Access',
        rows: [
          ['Client CSV import', 'Enabled', 'Name, phone, email, address and notes'],
          ['Export pack', 'Ready', 'Clients, jobs, invoices and payroll review'],
          ['Roles', 'Owner, worker, subcontractor', 'Access controlled by role'],
          ['Security', 'Session and business isolation', 'Business records stay separated'],
        ],
      },
    ],
  },
  plans: {
    title: 'Locked pricing desk',
    intro: 'Pricing stays clear, premium and unchanged.',
    stats: [
      ['$39', 'Start', '+ GST'],
      ['$89', 'Crew', '+ GST'],
      ['$149', 'Operator', 'Most Popular'],
      ['$299', 'Command', '+ GST'],
    ],
    sections: [
      {
        title: 'Plans',
        rows: [
          ['Start', '$39/month + GST', 'Jobs, clients, quotes and invoices.'],
          ['Crew', '$89/month + GST', 'Worker app and team records.'],
          ['Operator', '$149/month + GST', 'Most Popular. Churvox prepares admin.'],
          ['Command', '$299/month + GST', 'Full approval OS and one accounting sync option.'],
        ],
      },
      {
        title: 'Add-ons',
        rows: [
          ['Command Growth Pack', '$99/month + GST', 'Adds 50 active team members plus extra capacity.'],
          ['Accounting Sync Add-on', '$39/month + GST', 'For non-Command tiers where available.'],
        ],
      },
      {
        title: 'Current Plan Controls',
        rows: [
          ['Trial', '14 days, no card', 'Clear upgrade path.'],
          ['Billing', 'Monthly', 'GST shown separately.'],
          ['Plan rules', 'Locked', 'No hidden pricing changes.'],
        ],
      },
    ],
  },
  help: {
    title: 'Help desk and setup',
    intro: 'Support, setup checks, short guides and ticket history in one page.',
    stats: [
      ['Open', 'ticket form', 'Ready'],
      ['4', 'setup checks', 'Visible'],
      ['4', 'short guides', 'Quick help'],
      ['hello@', 'support email', 'churvox.com'],
    ],
    sections: [
      {
        title: 'New Ticket',
        rows: [
          ['Area', 'Setup, billing, worker app or data import', 'Required'],
          ['Priority', 'Normal, urgent or stuck', 'Selectable'],
          ['Message', 'Describe what is not working', 'Editable'],
          ['Contact', 'hello@churvox.com', 'Support inbox'],
        ],
      },
      {
        title: 'Setup Checklist',
        rows: [
          ['Business profile', 'Name, logo, email and GST', 'Ready'],
          ['Clients', 'Add client or CSV import', 'Next'],
          ['Workers', 'Invite staff and check app status', 'Next'],
          ['Command', 'Review approval desk before sending anything', 'Ready'],
        ],
      },
      {
        title: 'Short Guides',
        rows: [
          ['Add a client', 'Create or import, then save service and price memory.', 'Guide'],
          ['Create a job', 'Pick service, worker, date, time, price and frequency.', 'Guide'],
          ['Use Command', 'Check filled forms, then approve, edit or park.', 'Guide'],
          ['Accounting sync', 'Draft sync only after owner approval.', 'Guide'],
        ],
      },
    ],
  },
};

function css() {
  return `
    .${CONTROL_LAYER_CLASS}{display:grid;grid-column:1/-1;gap:14px;margin-top:4px;color:#111815}
    .${CONTROL_LAYER_CLASS} .depthHero{display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:18px;align-items:end;padding:18px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:linear-gradient(135deg,#fff 0%,#f8faf9 64%,#fff7ed 100%);box-shadow:0 18px 36px rgba(16,21,19,.06)}
    .${CONTROL_LAYER_CLASS} .depthHero h2{margin:0;font-size:28px;line-height:1.05;letter-spacing:0;color:#111815}
    .${CONTROL_LAYER_CLASS} .depthHero p{max-width:720px;margin:8px 0 0;color:#52605a;font-size:13px;font-weight:850}
    .${CONTROL_LAYER_CLASS} .depthStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .${CONTROL_LAYER_CLASS} .depthStat{display:grid;gap:3px;min-width:110px;padding:12px;border:1px solid rgba(16,21,19,.08);border-radius:14px;background:#fff;box-shadow:0 12px 24px rgba(16,21,19,.045)}
    .${CONTROL_LAYER_CLASS} .depthStat b{font-size:22px;line-height:1;color:#111815}
    .${CONTROL_LAYER_CLASS} .depthStat span{font-size:11px;color:#52605a;font-weight:950;text-transform:uppercase;letter-spacing:.04em}
    .${CONTROL_LAYER_CLASS} .depthStat small{font-size:11px;color:#9a3412;font-weight:950}
    .${CONTROL_LAYER_CLASS} .depthSections{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .${CONTROL_LAYER_CLASS} .depthSection{overflow:hidden;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .${CONTROL_LAYER_CLASS} .depthSection h3{margin:0;padding:10px 12px;background:linear-gradient(90deg,#101513 0%,#1c2320 100%);color:#fff;font-size:13px;font-weight:950}
    .${CONTROL_LAYER_CLASS} .depthRows{display:grid;padding:10px;gap:8px}
    .${CONTROL_LAYER_CLASS} .depthRow{display:grid;grid-template-columns:minmax(92px,.75fr) minmax(120px,1fr) auto;gap:10px;align-items:center;min-height:50px;padding:9px 10px;border:1px solid rgba(16,21,19,.07);border-radius:12px;background:#f8faf9}
    .${CONTROL_LAYER_CLASS} .depthRow b{font-size:12px;color:#111815}
    .${CONTROL_LAYER_CLASS} .depthRow span{font-size:12px;color:#52605a;font-weight:850}
    .${CONTROL_LAYER_CLASS} .depthRow em{justify-self:end;border-radius:999px;padding:5px 8px;background:#fff7ed;color:#9a3412;font-size:10px;font-style:normal;font-weight:950;white-space:nowrap}
    .churvoxOptionC:has(.${CONTROL_LAYER_CLASS}) .cocPage>.cocPanel{min-height:0!important}
    @media(max-width:1100px){
      .${CONTROL_LAYER_CLASS} .depthHero{grid-template-columns:1fr}
      .${CONTROL_LAYER_CLASS} .depthStats{grid-template-columns:repeat(2,minmax(0,1fr))}
      .${CONTROL_LAYER_CLASS} .depthSections{grid-template-columns:1fr}
    }
    @media(max-width:620px){
      .${CONTROL_LAYER_CLASS} .depthStats{grid-template-columns:1fr}
      .${CONTROL_LAYER_CLASS} .depthRow{grid-template-columns:1fr}
      .${CONTROL_LAYER_CLASS} .depthRow em{justify-self:start}
    }
  `;
}

function currentPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (pages[hash]) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function rowMarkup(row) {
  return `<div class="depthRow"><b>${row[0]}</b><span>${row[1]}</span><em>${row[2]}</em></div>`;
}

function render(pageKey) {
  const page = pages[pageKey];
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!page || !root) return;

  const old = root.querySelector(`.${CONTROL_LAYER_CLASS}`);
  if (old && old.getAttribute('data-page') === pageKey) return;
  if (old) old.remove();

  const layer = document.createElement('section');
  layer.className = CONTROL_LAYER_CLASS;
  layer.setAttribute('data-page', pageKey);
  layer.innerHTML = `
    <div class="depthHero">
      <div><h2>${page.title}</h2><p>${page.intro}</p></div>
      <div class="depthStats">${page.stats.map((stat) => `<div class="depthStat"><b>${stat[0]}</b><span>${stat[1]}</span><small>${stat[2]}</small></div>`).join('')}</div>
    </div>
    <div class="depthSections">${page.sections.map((section) => `<article class="depthSection"><h3>${section.title}</h3><div class="depthRows">${section.rows.map(rowMarkup).join('')}</div></article>`).join('')}</div>
  `;
  root.appendChild(layer);
}

function ensureStyle() {
  if (document.getElementById(CONTROL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CONTROL_STYLE_ID;
  style.textContent = css();
  document.head.appendChild(style);
}

function enhance() {
  ensureStyle();
  const page = currentPage();
  if (pages[page]) render(page);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', enhance);
  window.addEventListener('hashchange', () => setTimeout(enhance, 50));
  window.addEventListener('popstate', () => setTimeout(enhance, 50));
  document.addEventListener('click', () => setTimeout(enhance, 80));
  setInterval(enhance, 1000);
}
