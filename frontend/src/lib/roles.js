export const isWorker = (u) => (u?.role || '').toLowerCase()==='worker';
export const canAccess = (u, r=[]) => !r.length || r.includes((u?.role||'').toLowerCase());
