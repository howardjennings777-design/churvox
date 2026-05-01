import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(true);
  const refresh = async()=>{ try{ const me=await apiFetch('/auth/me'); setUser(me.user||me);}catch{setUser(null);} finally{setLoading(false);} };
  useEffect(()=>{refresh();},[]);
  const login = async(payload)=>{ const r=await apiFetch('/auth/login',{method:'POST',body:JSON.stringify(payload)}); if(r.token) localStorage.setItem('token',r.token); await refresh(); return r; };
  const signup = async(payload)=> apiFetch('/auth/register',{method:'POST',body:JSON.stringify(payload)});
  const logout = async()=>{ try{await apiFetch('/auth/logout',{method:'POST'});}catch{} localStorage.removeItem('token'); setUser(null); };
  return <Ctx.Provider value={{user,loading,login,signup,logout,refresh}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);
