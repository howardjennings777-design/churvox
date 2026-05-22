import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(140deg,#0f1419,#171d24 48%,#222b35)", color: "#eef2f5", fontFamily: "Inter, system-ui, sans-serif" },
  nav: { minHeight: 72, display: "flex", alignItems: "center", gap: 22, padding: "0 clamp(16px,4vw,72px)", background: "linear-gradient(90deg,#11171d,#212a33)", borderBottom: "1px solid #3f4b57" },
  logo: { display: "flex", textDecoration: "none" }, links: { display: "flex", gap: 8, flex: 1 },
  link: { color: "#c6cfd6", textDecoration: "none", fontWeight: 700, fontSize: 13, padding: "10px 12px", borderRadius: 10 },
  wrap: { minHeight: "calc(100vh - 72px)", display: "grid", gridTemplateColumns: "minmax(340px,.86fr) minmax(0,1.14fr)", gap: 24, alignItems: "center", padding: "clamp(28px,6vw,68px) clamp(16px,4vw,72px)" },
  form: { background: "linear-gradient(180deg,#252f39,#1d252d)", border: "1px solid #3f4b57", borderRadius: 18, padding: "clamp(24px,4vw,42px)" },
  kicker: { margin: 0, color: "#70c6d2", textTransform: "uppercase", letterSpacing: ".15em", fontSize: 11, fontWeight: 900 },
  h1: { margin: "10px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(30px,4vw,42px)", lineHeight: 1, letterSpacing: "-.03em", color: "#eef2f5" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #3f4b57", borderRadius: 12, background: "#11171d", color: "#eef2f5", padding: "12px 14px", marginTop: 8, fontSize: 15 },
  btn: { width: "100%", border: "1px solid #e1bf81", borderRadius: 12, background: "linear-gradient(135deg,#d6a048,#ab7630)", color: "#1c1307", padding: "13px 16px", fontWeight: 900, marginTop: 18 },
  panel: { background: "linear-gradient(180deg,#252f39,#1d252d)", border: "1px solid #3f4b57", color: "#eef2f5", borderRadius: 18, padding: "clamp(24px,4vw,40px)" },
};

export default function LoginPage(){
const navigate=useNavigate();const {login}=useAuth();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);
const handleSubmit=async(e)=>{e.preventDefault();setError("");setLoading(true);try{const r=await login(email,password);if(r?.token)navigate(getPostLoginPath(r));else setError("Login failed. Please try again.");}catch(err){setError(err?.response?.data?.detail||"Invalid email or password.");}setLoading(false)};
return <main style={S.page}><header style={S.nav}><Link to="/" style={S.logo}><ChurvoxLogo/></Link><nav style={S.links}><Link to="/" style={S.link}>Home</Link><Link to="/features" style={S.link}>Features</Link><Link to="/pricing" style={S.link}>Pricing</Link></nav></header><section style={S.wrap}><form style={S.form} onSubmit={handleSubmit} data-testid="login-form"><p style={S.kicker}>Owner approval access</p><h1 style={S.h1}>Sign in to the control room.</h1><p style={{color:"#61708a",lineHeight:1.55}}>Open the prepared work, review the decision slips, and approve what Churvox has lined up.</p>{error&&<p style={{color:"#b42318",fontWeight:800}}>{error}</p>}<label style={{display:"block",fontWeight:850,marginTop:16}}>Email<input style={S.input} data-testid="login-email-input" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required/></label><label style={{display:"block",fontWeight:850,marginTop:14}}>Password<input style={S.input} data-testid="login-password-input" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required/></label><button style={S.btn} data-testid="login-submit-button" disabled={loading}>{loading?"Signing in…":"Sign in"}</button><p><Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link></p></form><aside style={S.panel}><p style={{...S.kicker,color:"#bfe8ff"}}>Industrial approval system</p><h2 style={{fontFamily:"Outfit,Inter,sans-serif",fontSize:"clamp(34px,4vw,52px)",lineHeight:.84,letterSpacing:"-.08em",margin:"12px 0",color:"#fff"}}>Churvox prepares the admin before you arrive.</h2><p style={{color:"rgba(255,255,255,.78)",fontSize:18,lineHeight:1.6}}>Invoices, crew moves, quote follow-ups, missing info and money items wait here as clear owner decisions — not a messy wall of pages.</p></aside></section></main>
}