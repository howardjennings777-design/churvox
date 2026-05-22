import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import PricingTiers from "../../components/marketing/PricingTiers";
import HomeInlineLogin from "../../components/marketing/HomeInlineLogin";

const features = [
  ["Work queue", "Jobs, quotes, invoices and worker updates surfaced in one owner queue."],
  ["Approval slips", "Every prepared action shows the reason, the facts and the next step."],
  ["Worker app", "Assigned jobs, notes, photos, directions and status updates without owner-only data."],
  ["Money desk", "Completed jobs, draft invoices, open balances and reminders kept visible."],
];

const workflow = [
  ["1", "Work comes in", "Jobs, quote requests, notes, photos and invoices land in Churvox."],
  ["2", "Churvox prepares", "The system drafts admin actions and flags missing information."],
  ["3", "You approve", "Nothing important sends, syncs or changes until the owner taps approve."],
  ["4", "Crew executes", "Workers see only the job information they need to complete the work."],
];

function CTA({ to, children, primary }) {
  return (
    <Link className={primary ? "home-btn home-btn-primary" : "home-btn"} to={to}>{children}</Link>
  );
}

function ConsolePreview() {
  return (
    <div className="home-console" aria-label="Churvox operator desk preview">
      <div className="home-console-top"><span /> <b>Churvox Operator Desk</b><em>Live</em></div>
      <div className="home-console-grid">
        <section className="home-console-main">
          <div className="home-console-label">Today’s queue</div>
          {[
            ["Draft invoice ready", "Tree pruning · ECB Property Maintenance", "$480"],
            ["Worker assignment needed", "Lawn care · no worker assigned", "Assign"],
            ["Quote follow-up", "Fence repair quote waiting", "Draft"],
          ].map(([title, detail, action], i) => (
            <div className={i === 0 ? "home-queue-row active" : "home-queue-row"} key={title}>
              <div><strong>{title}</strong><p>{detail}</p></div><span>{action}</span>
            </div>
          ))}
        </section>
        <aside className="home-work-slip">
          <div className="home-console-label">Work slip</div>
          <h3>Invoice prepared</h3>
          <p>Churvox found a completed job with worker notes and proof photos. Review the invoice before sending.</p>
          <dl><div><dt>Client</dt><dd>ECB Property</dd></div><div><dt>Proof</dt><dd>4 photos</dd></div><div><dt>Status</dt><dd>Ready</dd></div></dl>
          <button type="button">Approve action</button>
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  useEffect(() => { document.title = "Churvox — AI front desk for trade businesses"; }, []);

  return (
    <MarketingShell>
      <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker">AI front desk for trade businesses</p>
            <h1>Run the admin from one serious workbench.</h1>
            <p className="home-lead">Churvox prepares the jobs, quotes, invoices, worker actions and follow-ups. You approve what matters and keep the business moving.</p>
            <div className="home-actions"><CTA to="/signup" primary>Start free</CTA><a className="home-btn" href="#home-login">Log in</a><CTA to="/pricing">See pricing</CTA></div>
          </div>
          <ConsolePreview />
        </section>

        <HomeInlineLogin />

        <section className="home-proof">
          <div><strong>Approval-first</strong><span>No customer messages, pricing changes or syncs without the owner.</span></div>
          <div><strong>Built for the field</strong><span>Worker app, photos, notes, status and directions.</span></div>
          <div><strong>Money stays visible</strong><span>Completed work, draft invoices and open balances in one desk.</span></div>
        </section>

        <section className="home-section home-workflow">
          <div className="home-section-head"><p className="home-kicker">How it works</p><h2>Less dashboard. More operating desk.</h2></div>
          <div className="home-step-grid">
            {workflow.map(([n, title, text]) => <article key={title}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="home-section home-features">
          <div className="home-section-head"><p className="home-kicker">What Churvox handles</p><h2>The core workspaces stay connected.</h2></div>
          <div className="home-feature-grid">
            {features.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="home-section home-pricing-preview">
          <div className="home-section-head"><p className="home-kicker">Plans</p><h2>Start simple. Upgrade when the workload grows.</h2></div>
          <PricingTiers compact showAddons={false} />
          <div className="home-pricing-link"><CTA to="/pricing">View full pricing</CTA></div>
        </section>

        <section className="home-final">
          <div><p className="home-kicker">Ready when you are</p><h2>Give the admin a proper front desk.</h2><p>Start with your first client, first job and first worker. Churvox keeps the next action in front of you.</p></div>
          <div className="home-final-actions"><CTA to="/signup" primary>Start free</CTA><a className="home-btn" href="#home-login">Log in</a></div>
        </section>
      </main>

      <style>{`
        .home-page{background:#e8e2d6;color:#101114}.home-hero{min-height:calc(100vh - 74px);display:grid;grid-template-columns:minmax(0,.92fr) minmax(520px,1.08fr);gap:34px;align-items:center;padding:clamp(40px,6vw,86px) clamp(18px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#242830 48%,#e8e2d6 48%,#f3eee5 100%)}.home-hero-copy{color:#fbf8f1;max-width:760px}.home-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:#9b8059;margin:0 0 16px}.home-hero .home-kicker{color:#caa46d}.home-hero h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(52px,7vw,104px);line-height:.9;letter-spacing:-.07em;margin:0;color:#fbf8f1}.home-lead{font-size:clamp(17px,1.6vw,21px);line-height:1.55;color:rgba(251,248,241,.76);max-width:650px;margin:24px 0 0}.home-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.home-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid rgba(251,248,241,.28);background:rgba(251,248,241,.06);color:#fbf8f1;border-radius:8px;padding:13px 18px;font-weight:900}.home-btn-primary{background:#fbf8f1;color:#101114;border-color:#fbf8f1}.home-console{background:#101114;border:1px solid #343a44;border-radius:14px;box-shadow:0 42px 120px rgba(16,17,20,.42);padding:14px;color:#fbf8f1}.home-console-top{display:flex;align-items:center;gap:10px;border-bottom:1px solid #343a44;padding:6px 6px 14px}.home-console-top span{width:10px;height:10px;border-radius:50%;background:#c58a2b}.home-console-top b{font-size:13px}.home-console-top em{margin-left:auto;font-style:normal;color:#9aa2ad;font-size:12px}.home-console-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;padding-top:14px}.home-console-main,.home-work-slip{background:#181c22;border:1px solid #343a44;border-radius:12px;padding:16px}.home-console-label{text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#9aa2ad;font-weight:900;margin-bottom:12px}.home-queue-row{display:flex;justify-content:space-between;gap:12px;background:#101114;border:1px solid #343a44;border-radius:10px;padding:14px;margin-top:10px}.home-queue-row.active{border-color:#c58a2b;box-shadow:inset 3px 0 0 #c58a2b}.home-queue-row strong{font-size:14px}.home-queue-row p{margin:4px 0 0;color:#9aa2ad;font-size:12px}.home-queue-row span{font-size:12px;font-weight:900;background:#fbf8f1;color:#101114;border-radius:999px;padding:6px 9px;height:max-content}.home-work-slip h3{font-family:Outfit,Inter,sans-serif;font-size:28px;line-height:1;margin:0 0 10px}.home-work-slip p{color:#c6ccd5;line-height:1.5}.home-work-slip dl{display:grid;gap:8px}.home-work-slip dl div{display:flex;justify-content:space-between;border-bottom:1px solid #343a44;padding-bottom:8px}.home-work-slip dt{color:#9aa2ad}.home-work-slip dd{margin:0;font-weight:800}.home-work-slip button{width:100%;border:0;background:#fbf8f1;color:#101114;border-radius:8px;padding:13px 14px;font-weight:900;margin-top:14px}.home-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#cdc3b3;padding:1px;margin:0 clamp(18px,4vw,64px);transform:translateY(-28px);box-shadow:0 18px 46px rgba(16,17,20,.12)}.home-proof div{background:#fbf8f1;padding:22px}.home-proof strong{display:block}.home-proof span{display:block;margin-top:6px;color:#5f6670;font-size:14px;line-height:1.45}.home-section{padding:clamp(58px,7vw,104px) clamp(18px,4vw,64px)}.home-section-head{max-width:850px;margin-bottom:30px}.home-section h2,.home-final h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(34px,4.8vw,68px);line-height:.96;letter-spacing:-.06em;margin:0}.home-step-grid,.home-feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.home-step-grid article,.home-feature-grid article{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;padding:24px;box-shadow:0 12px 34px rgba(16,17,20,.07)}.home-step-grid article span{font-family:Outfit,Inter,sans-serif;font-size:44px;font-weight:900;color:#c58a2b}.home-step-grid h3,.home-feature-grid h3{font-size:19px;margin:14px 0 8px}.home-step-grid p,.home-feature-grid p,.home-final p{color:#5f6670;line-height:1.55}.home-features{background:#f3eee5}.home-pricing-preview{background:#101114;color:#fbf8f1}.home-pricing-preview .home-kicker{color:#caa46d}.home-pricing-preview h2{color:#fbf8f1}.home-pricing-link{display:flex;justify-content:center;margin-top:24px}.home-final{display:flex;justify-content:space-between;gap:24px;align-items:center;background:#fbf8f1;border-top:1px solid #cdc3b3;padding:clamp(48px,6vw,80px) clamp(18px,4vw,64px)}.home-final .home-btn{background:#101114;color:#fbf8f1;border-color:#101114}.home-final-actions{display:flex;gap:12px;flex-wrap:wrap}@media(max-width:1100px){.home-hero{grid-template-columns:1fr;background:linear-gradient(180deg,#101114 0%,#242830 58%,#e8e2d6 58%,#f3eee5 100%)}.home-console-grid{grid-template-columns:1fr}.home-step-grid,.home-feature-grid{grid-template-columns:1fr 1fr}.home-proof{grid-template-columns:1fr}}@media(max-width:680px){.home-hero{padding:34px 14px}.home-hero h1{font-size:48px}.home-section,.home-final{padding-left:14px;padding-right:14px}.home-step-grid,.home-feature-grid{grid-template-columns:1fr}.home-final{display:block}.home-final .home-btn{margin-top:18px}.home-proof{margin:0 14px}}
      `}</style>
    </MarketingShell>
  );
}
