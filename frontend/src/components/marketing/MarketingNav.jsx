import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChurvoxLogo } from "../ChurvoxLogo";

export default function MarketingNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const links = [
    { to: "/features", label: "Features" },
    { to: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="mkt-nav">
      <Link to="/" className="mkt-logo" aria-label="Churvox home"><ChurvoxLogo /></Link>
      <nav className="mkt-links">
        {links.map((l) => <Link key={l.to} to={l.to} className={location.pathname === l.to ? "active" : ""}>{l.label}</Link>)}
      </nav>
      <div className="mkt-actions">
        {user ? <Link to="/dashboard" className="mkt-login">Dashboard</Link> : <Link to="/login" className="mkt-login">Log in</Link>}
        <Link to={user ? "/dashboard" : "/signup"} className="mkt-primary">{user ? "Open Churvox" : "Start free"}</Link>
        <button type="button" className="mkt-menu" onClick={() => setOpen((v) => !v)} aria-label="Open menu"><span /><span /><span /></button>
      </div>
      {open ? <div className="mkt-mobile"><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/login">Log in</Link><Link to="/signup">Start free</Link></div> : null}
      <style>{`
        .mkt-nav{position:sticky;top:0;z-index:100;height:74px;background:#101114;color:#fbf8f1;display:flex;align-items:center;gap:24px;padding:0 clamp(16px,4vw,64px);box-shadow:0 18px 50px rgba(16,17,20,.22)}
        .mkt-logo{display:flex;align-items:center;text-decoration:none;filter:invert(1) grayscale(1) brightness(2);min-width:132px}
        .mkt-links{display:flex;gap:6px;align-items:center;flex:1}.mkt-links a,.mkt-login{color:rgba(251,248,241,.72);text-decoration:none;font-weight:800;font-size:14px;padding:10px 12px;border-radius:8px}.mkt-links a:hover,.mkt-links a.active,.mkt-login:hover{background:#242830;color:#fbf8f1}.mkt-actions{display:flex;align-items:center;gap:10px}.mkt-primary{background:#fbf8f1;color:#101114;text-decoration:none;border-radius:8px;padding:12px 16px;font-weight:900;font-size:14px}.mkt-menu{display:none;background:#242830;border:1px solid #343a44;border-radius:8px;width:40px;height:40px;align-items:center;justify-content:center;flex-direction:column;gap:4px}.mkt-menu span{width:17px;height:2px;background:#fbf8f1}.mkt-mobile{position:absolute;left:0;right:0;top:74px;background:#101114;border-top:1px solid #343a44;padding:10px 16px 16px;display:grid;gap:6px}.mkt-mobile a{color:#fbf8f1;text-decoration:none;padding:12px;border-radius:8px;font-weight:800}.mkt-mobile a:hover{background:#242830}@media(max-width:820px){.mkt-links,.mkt-login{display:none}.mkt-menu{display:flex}.mkt-nav{height:66px}.mkt-mobile{top:66px}.mkt-logo{min-width:120px}}`}</style>
    </header>
  );
}
