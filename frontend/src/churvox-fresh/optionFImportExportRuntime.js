const STORAGE_KEY = 'churvox_option_f_working_actions_v1';
const IMPORT_INPUT_ID = 'option-f-import-file-input';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function toast(message) {
  let node = document.getElementById('option-f-import-export-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'option-f-import-export-toast';
    node.style.cssText = 'position:fixed;right:18px;bottom:104px;z-index:999999;border-radius:14px;padding:12px 14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.style.opacity = '1';
  node.style.transform = 'translateY(0)';
  clearTimeout(node._timer);
  node._timer = setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(12px)';
  }, 2600);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header || `field_${index + 1}`, row[index] || ''])));
}

function normalizeClient(record) {
  return {
    id: `import-client-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: record.name || record.client || record.customer || record.customer_name || '',
    phone: record.phone || record.mobile || record.contact_number || '',
    email: record.email || record.email_address || '',
    address: record.address || record.site_address || record.street || '',
    service: record.service || record.service_memory || record.default_service || '',
    price: record.price || record.price_memory || record.default_price || '',
    notes: record.notes || record.note || record.access_notes || '',
    importedAt: new Date().toISOString(),
  };
}

function normalizeJob(record) {
  return {
    id: `import-job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: record.title || record.job || record.job_name || record.service || 'Imported job',
    client: record.client || record.customer || record.customer_name || '',
    address: record.address || record.site_address || '',
    worker: record.worker || record.assigned_worker || '',
    date: record.date || record.scheduled_date || '',
    time: record.time || record.scheduled_time || '',
    price: record.price || record.amount || '',
    recurring: record.recurring || record.frequency || '',
    notes: record.notes || '',
    importedAt: new Date().toISOString(),
  };
}

function importRecords(kind, objects) {
  const state = loadState();
  const key = kind === 'jobs' ? 'jobs' : 'clients';
  const normalizer = key === 'jobs' ? normalizeJob : normalizeClient;
  const records = objects.map(normalizer).filter((record) => record.name || record.title || record.client);
  state[key] = [...records, ...(state[key] || [])].slice(0, 200);
  state.audit = [{ action: `Imported ${records.length} ${key}`, detail: 'CSV import', at: new Date().toLocaleString('en-NZ') }, ...(state.audit || [])].slice(0, 30);
  saveState(state);
  toast(`Imported ${records.length} ${key}`);
  window.dispatchEvent(new Event('hashchange'));
}

function ensureInput() {
  let input = document.getElementById(IMPORT_INPUT_ID);
  if (!input) {
    input = document.createElement('input');
    input.id = IMPORT_INPUT_ID;
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.hidden = true;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const page = input.dataset.page || currentPage();
      const objects = rowsToObjects(parseCsv(text));
      importRecords(page === 'jobs' ? 'jobs' : 'clients', objects);
      input.value = '';
    });
    document.body.appendChild(input);
  }
  return input;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(records) {
  const headers = Array.from(records.reduce((set, record) => {
    Object.keys(record || {}).forEach((key) => {
      if (!key.startsWith('_')) set.add(key);
    });
    return set;
  }, new Set(['name', 'title', 'client', 'phone', 'email', 'address', 'service', 'price', 'notes'])));
  return [headers.join(','), ...records.map((record) => headers.map((header) => csvEscape(record?.[header] || '')).join(','))].join('\n');
}

function downloadCsv(kind) {
  const state = loadState();
  const records = state[kind] || [];
  if (!records.length) {
    toast(`No saved ${kind} to export yet`);
    return;
  }
  const blob = new Blob([toCsv(records)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `churvox-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`Exported ${records.length} ${kind}`);
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !document.querySelector('.churvoxOptionC')) return;
  const text = button.textContent.trim().toLowerCase();
  const page = currentPage();
  if (text.includes('csv import')) {
    event.preventDefault();
    event.stopPropagation();
    const input = ensureInput();
    input.dataset.page = page === 'jobs' ? 'jobs' : 'clients';
    input.click();
  }
  if (text === 'export') {
    event.preventDefault();
    event.stopPropagation();
    downloadCsv(page === 'jobs' ? 'jobs' : page === 'quotes' ? 'quotes' : 'clients');
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClick, true);
}
