function isJobsPage() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return hash === 'jobs' || /jobs/i.test(active?.textContent || '') || Boolean(document.querySelector('.churvoxOptionC .jobsPage'));
}

function panelHtml(title, tone, body) {
  return `<section class="cocPanel ${tone} churvoxJobsRestorePanel"><h2>${title}</h2>${body}</section>`;
}

function rowHtml(title, meta, tone = 'blue') {
  return `<button type="button" class="cocRow ${tone}"><i></i><span><b>${title}</b><small>${meta}</small></span></button>`;
}

function jobText(selector, fallback) {
  const node = document.querySelector(`.churvoxOptionC .jobsPage .jobCard ${selector}`);
  const text = String(node?.textContent || '').trim();
  return text || fallback;
}

function ensureJobsPanels() {
  if (!isJobsPage()) {
    document.querySelectorAll('.churvoxJobsRestorePanel').forEach((node) => node.remove());
    return;
  }

  const page = document.querySelector('.churvoxOptionC .jobsPage');
  if (!page) return;

  const existingPanels = page.querySelectorAll('.cocPanel').length;
  if (existingPanels >= 3) return;
  if (page.querySelector('.churvoxJobsRestorePanel')) return;

  const firstJobTitle = jobText('b', 'New job record');
  const firstJobMeta = jobText('small', 'Client, worker and site details');
  const firstJobTiming = jobText('span', 'Date, time and repeat schedule');
  const firstJobStatus = jobText('i', 'Status ready');
  const firstJobPrice = jobText('em', 'Price not set');

  page.insertAdjacentHTML('beforeend', panelHtml(
    'Editable Job Form',
    'amber wide',
    `<div class="formGrid compactForm">
      <label class="cocField"><span>Job name</span><input readonly value="${firstJobTitle.replace(/"/g, '&quot;')}" /></label>
      <label class="cocField"><span>Client / worker</span><input readonly value="${firstJobMeta.replace(/"/g, '&quot;')}" /></label>
      <label class="cocField"><span>Date, time and repeat</span><input readonly value="${firstJobTiming.replace(/"/g, '&quot;')}" /></label>
      <label class="cocField"><span>Price</span><input readonly value="${firstJobPrice.replace(/"/g, '&quot;')}" /></label>
      <label class="cocField"><span>Status</span><input readonly value="${firstJobStatus.replace(/"/g, '&quot;')}" /></label>
      <label class="cocField"><span>Owner rule</span><input readonly value="Edit or approve decisions stay in Command" /></label>
    </div>`
  ));

  page.insertAdjacentHTML('beforeend', panelHtml(
    'Recurring + Next Work',
    'blue',
    `${rowHtml('Weekly / fortnightly / monthly', 'Repeat controls live inside Jobs', 'blue')}
     ${rowHtml('Next visit prepared', 'Churvox keeps the schedule visible', 'blue')}
     ${rowHtml('Dispatch ready', 'Worker and time are clear before the day starts', 'blue')}`
  ));

  page.insertAdjacentHTML('beforeend', panelHtml(
    'Proof + Status',
    'coral',
    `${rowHtml('Photos and notes', 'Worker proof attaches to the job record', 'coral')}
     ${rowHtml('Issue handling', 'Anything risky goes to Command for owner review', 'coral')}
     ${rowHtml('Invoice-ready record', 'Clean job details feed draft invoices only', 'coral')}`
  ));
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(ensureJobsPanels, 120));
  window.addEventListener('hashchange', () => setTimeout(ensureJobsPanels, 120));
  window.addEventListener('popstate', () => setTimeout(ensureJobsPanels, 120));
  document.addEventListener('click', () => setTimeout(ensureJobsPanels, 180), true);
  setInterval(ensureJobsPanels, 900);
}

export {};
