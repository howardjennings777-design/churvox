export const API_BASE = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '').replace(/\/$/,'');
export async function apiFetch(path, options={}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers||{}), ...(token?{Authorization:`Bearer ${token}`}:{}) };
  const res = await fetch(`${API_BASE}${path.startsWith('/api')?path:'/api'+path}`, { ...options, headers, credentials:'include' });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}
