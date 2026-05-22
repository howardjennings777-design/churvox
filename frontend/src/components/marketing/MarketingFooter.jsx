import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../ChurvoxLogo";

const columns = [
  { title: "Product", links: [["/features", "Features"], ["/pricing", "Pricing"], ["/signup", "Start free"], ["/login", "Log in"]] },
  { title: "Workspaces", links: [["/features", "Front Desk"], ["/features", "Worker app"], ["/features", "Invoices"], ["/features", "Payroll"]] },
  { title: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/account-deletion", "Account deletion"]] },
];

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <div className="site-footer-logo"><ChurvoxLogo /></div>
          <p>A serious front desk for trade and service businesses. Jobs, quotes, invoices, crew and money stay in one operating view.</p>
        </div>
        {columns.map((col) => (
          <div className="site-footer-col" key={col.title}>
            <h3>{col.title}</h3>
            {col.links.map(([to, label]) => <Link key={`${col.title}-${label}`} to={to}>{label}</Link>)}
          </div>
        ))}
      </div>
      <div className="site-footer-bottom"><span>© {year} Churvox. All rights reserved.</span><span>Work prepared. Owner approved.</span></div>
      <style>{`.site-footer{background:#101114;color:#fbf8f1;border-top:1px solid #272b32;padding:54px clamp(18px,4vw,64px) 30px;margin-top:0}.site-footer-grid{max-width:1320px;margin:0 auto;display:grid;grid-template-columns:minmax(260px,1.4fr) repeat(3,minmax(150px,1fr));gap:34px}.site-footer-logo{filter:invert(1) grayscale(1) brightness(2);margin-bottom:14px}.site-footer-brand p{margin:0;max-width:380px;color:rgba(251,248,241,.64);font-size:14px;line-height:1.65}.site-footer-col{display:grid;align-content:start;gap:9px}.site-footer-col h3{margin:0 0 5px;color:#caa46d;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:900}.site-footer-col a{color:rgba(251,248,241,.68);text-decoration:none;font-size:14px;font-weight:700}.site-footer-col a:hover{color:#fbf8f1}.site-footer-bottom{max-width:1320px;margin:34px auto 0;padding-top:20px;border-top:1px solid #272b32;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;color:rgba(251,248,241,.48);font-size:13px}@media(max-width:840px){.site-footer-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.site-footer-grid{grid-template-columns:1fr}}`}</style>
    </footer>
  );
}
