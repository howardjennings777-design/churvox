import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";

const systems = [
  ["Front Desk", "The owner queue for approvals, blockers, crew movement and money."],
  ["Work Slips", "A clean approval sheet for each action Churvox prepares."],
  ["Jobs", "Create, assign, track, pause, complete and invoice work from one flow."],
  ["Worker app", "Assigned jobs, photos, notes, status and directions on mobile."],
  ["Quotes", "Prepare, send, follow up and convert approved quotes into jobs."],
  ["Invoices", "Draft from completed jobs, send clean links and keep balances visible."],
  ["Payroll", "Review time, approved hours and export summaries without owner clutter."],
  ["MYOB + SMS", "Optional, approval-first integrations when your business is ready."],
];

const rails = [
  ["Owner control", "AI prepares the work. You approve before anything important happens."],
  ["Crew clarity", "Workers see only the jobs and actions they need. No pricing or admin noise."],
  ["Money visibility", "Completed work, open invoices and follow-ups stay in front of you."],
];

function Button({ to, children, primary }) {
  return <Link className={primary ? "features-btn features-btn-primary" : "features-btn"} to={to}>{children}</Link>;
}

function FeatureConsole() {
  return (
    <div className="features-console">
      <div className="features-console-bar"><b>Operator system map</b><span>Active</span></div>
      <div className="features-console-body">
        {systems.slice(0, 6).map(([title, text], i) => (
          <div className={i === 0 ? "features-module active" : "features-module"} key={title}>
            <small>{String(i + 1).padStart(2, "0")}</small>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  useEffect(() => { document.title = "Features — Churvox"; }, []);

  return (
    <MarketingShell>
      <main className="features-page">
        <section className="features-hero">
          <div className="features-copy">
            <p className="features-kicker">Features</p>
            <h1>The operating system behind the front desk.</h1>
            <p>Churvox connects jobs, clients, quotes, invoices, workers, proof and payroll into one approval-first system for trade and service businesses.</p>
            <div className="features-actions"><Button to="/signup" primary>Start free</Button><Button to="/pricing">See pricing</Button></div>
          </div>
          <FeatureConsole />
        </section>

        <section className="features-rails">
          {rails.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}
        </section>

        <section className="features-system">
          <div className="features-head"><p className="features-kicker">System modules</p><h2>Everything stays connected, without turning into a noisy dashboard.</h2></div>
          <div className="features-grid">
            {systems.map(([title, text], i) => <article key={title}><span>{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="features-workslip">
          <div>
            <p className="features-kicker">Approval-first</p>
            <h2>Work Slips explain the action before you approve it.</h2>
            <p>Instead of guessing what the software is doing, Churvox shows the client, job, amount, proof, missing data and reason each item was surfaced.</p>
          </div>
          <div className="features-slip">
            <small>Work Slip</small>
            <h3>Draft invoice prepared</h3>
            <p>Completed hedge trimming job has worker notes, proof photos and saved pricing. Review the invoice before sending.</p>
            <dl><div><dt>Client</dt><dd>Property Maintenance</dd></div><div><dt>Proof</dt><dd>6 photos</dd></div><div><dt>Action</dt><dd>Owner approval</dd></div></dl>
          </div>
        </section>

        <section className="features-final">
          <div><p className="features-kicker">Use it on real work</p><h2>Start with one job. Let the system show you the next action.</h2></div>
          <Button to="/signup" primary>Start free</Button>
        </section>
      </main>

      <style>{`
        .features-page{background:#e8e2d6;color:#101114}.features-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:#9b8059;margin:0 0 14px}.features-hero{display:grid;grid-template-columns:minmax(0,.94fr) minmax(520px,1.06fr);gap:34px;align-items:center;padding:clamp(48px,7vw,96px) clamp(18px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#242830 48%,#e8e2d6 48%,#f3eee5 100%)}.features-copy{color:#fbf8f1}.features-copy .features-kicker{color:#caa46d}.features-copy h1,.features-head h2,.features-workslip h2,.features-final h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(42px,6vw,84px);line-height:.94;letter-spacing:-.065em;margin:0}.features-copy h1{color:#fbf8f1}.features-copy p{max-width:680px;color:rgba(251,248,241,.76);font-size:18px;line-height:1.55}.features-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.features-btn{display:inline-flex;text-decoration:none;border:1px solid rgba(251,248,241,.28);background:rgba(251,248,241,.06);color:#fbf8f1;border-radius:8px;padding:13px 18px;font-weight:900}.features-btn-primary{background:#fbf8f1;color:#101114;border-color:#fbf8f1}.features-console{background:#101114;border:1px solid #343a44;border-radius:14px;box-shadow:0 42px 120px rgba(16,17,20,.42);padding:14px;color:#fbf8f1}.features-console-bar{display:flex;justify-content:space-between;border-bottom:1px solid #343a44;padding:8px 8px 14px;font-size:13px}.features-console-bar span{color:#caa46d;font-weight:900}.features-console-body{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:14px}.features-module{background:#181c22;border:1px solid #343a44;border-radius:12px;padding:16px}.features-module.active{border-color:#c58a2b;box-shadow:inset 3px 0 0 #c58a2b}.features-module small{color:#9aa2ad;font-weight:900}.features-module strong{display:block;margin-top:10px}.features-module p{color:#9aa2ad;font-size:12.5px;line-height:1.45}.features-rails{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#cdc3b3;padding:1px;margin:0 clamp(18px,4vw,64px);transform:translateY(-28px);box-shadow:0 18px 46px rgba(16,17,20,.12)}.features-rails article{background:#fbf8f1;padding:22px}.features-rails strong{display:block}.features-rails span{display:block;margin-top:6px;color:#5f6670;font-size:14px;line-height:1.45}.features-system{padding:clamp(48px,7vw,96px) clamp(18px,4vw,64px)}.features-head{max-width:900px;margin-bottom:30px}.features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.features-grid article{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;padding:24px;box-shadow:0 12px 34px rgba(16,17,20,.07)}.features-grid span{font-family:Outfit,Inter,sans-serif;font-size:42px;font-weight:900;color:#c58a2b}.features-grid h3{font-size:20px;margin:14px 0 8px}.features-grid p{color:#5f6670;line-height:1.5}.features-workslip{display:grid;grid-template-columns:1fr .8fr;gap:28px;align-items:center;background:#101114;color:#fbf8f1;padding:clamp(48px,7vw,96px) clamp(18px,4vw,64px)}.features-workslip .features-kicker{color:#caa46d}.features-workslip h2{color:#fbf8f1}.features-workslip p{color:rgba(251,248,241,.72);font-size:17px;line-height:1.55}.features-slip{background:#fbf8f1;color:#101114;border-radius:12px;padding:28px;box-shadow:0 34px 90px rgba(0,0,0,.28)}.features-slip small{text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#9b8059}.features-slip h3{font-family:Outfit,Inter,sans-serif;font-size:34px;letter-spacing:-.04em;line-height:1;margin:12px 0}.features-slip p{color:#5f6670}.features-slip dl{display:grid;gap:10px}.features-slip dl div{display:flex;justify-content:space-between;border-bottom:1px solid #ded4c4;padding-bottom:10px}.features-slip dt{color:#5f6670}.features-slip dd{margin:0;font-weight:900}.features-final{display:flex;justify-content:space-between;align-items:center;gap:24px;background:#fbf8f1;border-top:1px solid #cdc3b3;padding:clamp(48px,6vw,80px) clamp(18px,4vw,64px)}.features-final .features-btn{background:#101114;color:#fbf8f1;border-color:#101114}@media(max-width:1100px){.features-hero,.features-workslip{grid-template-columns:1fr;background:linear-gradient(180deg,#101114 0%,#242830 58%,#e8e2d6 58%,#f3eee5 100%)}.features-grid{grid-template-columns:1fr 1fr}.features-rails{grid-template-columns:1fr}}@media(max-width:680px){.features-hero{padding:34px 14px}.features-copy h1{font-size:48px}.features-console-body,.features-grid{grid-template-columns:1fr}.features-system,.features-workslip,.features-final{padding-left:14px;padding-right:14px}.features-final{display:block}.features-final .features-btn{margin-top:18px}.features-rails{margin-left:14px;margin-right:14px}}
      `}</style>
    </MarketingShell>
  );
}
