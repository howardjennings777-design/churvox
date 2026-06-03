import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import PlansPage from "./PlansPage";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div>
        </div>
      </div>

      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function PlansCommandContent() {
  return (
    <main className="plans-command-shell fixed inset-0 z-[2147483000] overflow-hidden bg-[#f5f7f1] text-slate-950" data-version="CHURVOX_PLANS_COMMAND_SIDEBAR_20260601">
      <style>{`
        html, body, #root { background: #f5f7f1 !important; }
        .plans-command-shell .plans-command-content {
          background: #f5f7f1 !important;
        }
        .plans-command-shell .cv-plans {
          min-height: auto !important;
          width: 100% !important;
          padding: 0 0 92px !important;
          background: transparent !important;
        }
        .plans-command-shell .cv-plans-shell {
          width: 100% !important;
          margin: 0 !important;
          max-width: none !important;
          gap: 18px !important;
        }
        .plans-command-shell .cv-plans-top {
          display: none !important;
        }
        .plans-command-shell .cv-plans-hero,
        .plans-command-shell .cv-card,
        .plans-command-shell .cv-user-blocks,
        .plans-command-shell .cv-myob-addon,
        .plans-command-shell .cv-sms-pricing,
        .plans-command-shell .cv-footer-row div,
        .plans-command-shell .cv-notice {
          background: #143658 !important;
          border: 1px solid rgba(103,232,249,.18) !important;
          box-shadow: 0 16px 38px rgba(12,33,57,.16) !important;
          backdrop-filter: none !important;
        }
        .plans-command-shell .cv-plans-hero {
          min-height: 150px !important;
          border-radius: 26px !important;
          padding: clamp(22px, 3vw, 34px) !important;
        }
        .plans-command-shell .cv-plans-hero h1 {
          font-size: 0 !important;
          line-height: .92 !important;
        }
        .plans-command-shell .cv-plans-hero h1::after {
          content: "Choose how much admin Churvox handles.";
          display: block;
          font-size: clamp(34px, 4.5vw, 62px) !important;
        }
        .plans-command-shell .cv-plans-hero p:not(.cv-kicker) {
          font-size: 0 !important;
        }
        .plans-command-shell .cv-plans-hero p:not(.cv-kicker)::after {
          content: "Start simple, add crew when you need it, or let Operator prepare the admin for approval. Command unlocks MYOB, payroll workspace and higher limits.";
          display: block;
          font-size: clamp(14px, 1.4vw, 17px) !important;
          line-height: 1.55 !important;
        }
        .plans-command-shell .cv-grid {
          gap: 16px !important;
          background: transparent !important;
        }
        .plans-command-shell .cv-card {
          border-radius: 24px !important;
          min-height: 390px !important;
          padding: 18px !important;
        }
        .plans-command-shell .cv-user-blocks,
        .plans-command-shell .cv-myob-addon,
        .plans-command-shell .cv-sms-pricing {
          border-radius: 24px !important;
        }
        .plans-command-shell .cv-tier-card button {
          font-size: 0 !important;
        }
        .plans-command-shell .cv-tier-card:nth-child(1) button::after { content: "Start trial"; }
        .plans-command-shell .cv-tier-card:nth-child(2) button::after { content: "Choose Crew"; }
        .plans-command-shell .cv-tier-card:nth-child(3) button::after { content: "Choose Operator"; }
        .plans-command-shell .cv-tier-card:nth-child(4) button::after { content: "Choose Command"; }
        .plans-command-shell .cv-tier-card.current button::after { content: "Current plan" !important; }
        .plans-command-shell .cv-tier-card button::after {
          font-size: 15px !important;
          font-weight: 900 !important;
        }
        .plans-command-shell .cv-user-block-buy {
          font-size: 0 !important;
        }
        .plans-command-shell .cv-user-block-buy::after {
          content: "Add Growth Pack";
          font-size: 15px !important;
          font-weight: 900 !important;
        }
        .plans-command-shell .cv-sms-pricing button {
          pointer-events: none !important;
          cursor: not-allowed !important;
          opacity: .72 !important;
          background: rgba(148,163,184,.28) !important;
          color: transparent !important;
          box-shadow: none !important;
          font-size: 0 !important;
        }
        .plans-command-shell .cv-sms-pricing button::after {
          content: "Coming soon";
          color: #e2e8f0 !important;
          font-size: 15px !important;
          font-weight: 900 !important;
        }
        .plans-command-shell .cv-footer-row div:first-child b {
          font-size: 0 !important;
        }
        .plans-command-shell .cv-footer-row div:first-child b::after {
          content: "Churvox prepares the admin";
          font-size: 16px !important;
        }
        @media (max-width: 1024px) {
          .plans-command-shell {
            overflow-y: auto !important;
          }
        }
      `}</style>

      <div className="flex h-full min-h-0">
        <Sidebar />

        <section className="plans-command-content min-w-0 flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">
          <PlansPage />
        </section>
      </div>
    </main>
  );
}

export default function PlansCommandPage() {
  if (typeof document === "undefined") return <PlansCommandContent />;
  return createPortal(<PlansCommandContent />, document.body);
}
