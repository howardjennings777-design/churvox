import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

export default function LoginPage(){
const navigate=useNavigate();const {login}=useAuth();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);
const handleSubmit=async(e)=>{e.preventDefault();setError("");setLoading(true);try{const r=await login(email,password);if(r?.token)navigate(getPostLoginPath(r));else setError("Login failed. Please try again.");}catch(err){setError(err?.response?.data?.detail||"Invalid email or password.");}setLoading(false)};
return <main className="cm-auth"><div className="cm-shell"><header className="cm-nav"><Link to="/">Churvox</Link><div><Link to="/features">Features</Link> <Link to="/pricing">Pricing</Link></div></header><section className="cm-auth-wrap"><form className="cm-form" onSubmit={handleSubmit} data-testid="login-form"><p className="cm-kicker">Command Machine</p><h1>Sign in</h1><p>Sign in to approve the work Churvox prepared.</p>{error&&<p>{error}</p>}<label>Email<input data-testid="login-email-input" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required/></label><label>Password<input data-testid="login-password-input" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required/></label><button data-testid="login-submit-button" disabled={loading}>{loading?"Signing in…":"Sign in"}</button><p><Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link></p></form><aside className="cm-panel cm-dark"><h2>CHURVOX COMMAND MACHINE</h2><p className="cm-sub">Churvox watches jobs, clients, quotes, invoices, workers, proof and payroll data. It prepares invoice drafts, follow-ups, reminders, assignment suggestions, and decision slips for approval.</p></aside></section></div></main>
}
