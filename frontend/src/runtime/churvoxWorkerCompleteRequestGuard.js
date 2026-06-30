import axios from 'axios';

const KEY = '__CHURVOX_WORKER_COMPLETE_REQUEST_GUARD__';
const WINDOW_MS = 10000;
const recent = new Map();

function pathOf(configOrResponse) {
  const raw = configOrResponse?.url || configOrResponse?.config?.url || '';
  try {
    return new URL(raw, window.location.origin).pathname.replace(/^\/api/, '');
  } catch {
    return String(raw || '').replace(/^.*\/api/, '');
  }
}

function idFrom(path, mode) {
  const worker = /^\/worker\/jobs\/([^/]+)\/complete$/i.exec(path || '');
  if (mode === 'worker') return worker ? decodeURIComponent(worker[1]) : '';
  const normal = /^\/jobs\/([^/]+)\/(timer\/complete|time\/complete|complete-timer|complete)$/i.exec(path || '');
  return normal ? decodeURIComponent(normal[1]) : '';
}

function fakeResponse(config, jobId) {
  return Promise.resolve({
    data: { success: true, skipped_duplicate: true, status: 'completed', job_id: jobId },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: null,
  });
}

if (typeof window !== 'undefined' && !window[KEY]) {
  window[KEY] = true;
  axios.interceptors.request.use((config) => {
    const method = String(config?.method || 'get').toLowerCase();
    if (method !== 'post') return config;
    const path = pathOf(config);
    const jobId = idFrom(path, 'normal');
    if (!jobId) return config;
    const at = recent.get(jobId) || 0;
    if (!at || Date.now() - at > WINDOW_MS) return config;
    config.adapter = () => fakeResponse(config, jobId);
    return config;
  });
  axios.interceptors.response.use((response) => {
    const method = String(response?.config?.method || 'get').toLowerCase();
    if (method === 'post') {
      const jobId = idFrom(pathOf(response), 'worker');
      if (jobId && response?.data?.success !== false) recent.set(jobId, Date.now());
    }
    return response;
  });
}

export {};
