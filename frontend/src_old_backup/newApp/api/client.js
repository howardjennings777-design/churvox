export const apiBase = process.env.REACT_APP_API_URL || '';
export async function apiFetch(path, options={}){ const token=localStorage.getItem('token'); const headers={...(options.headers||{}), ...(token?{Authorization:`Bearer ${token}`}:{})}; const res=await fetch(`${apiBase}${path}`,{...options,headers}); return res.json(); }
