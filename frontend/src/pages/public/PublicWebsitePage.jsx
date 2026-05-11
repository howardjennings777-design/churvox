import React from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  ContactRound,
  FileSpreadsheet,
  Hammer,
  Map,
  MessageSquareText,
  Navigation,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";
const features = [
  ["AI Operator Queue", "Churvox scans jobs, cash, crew, clients, proof, and prepares the next moves for owner approval.", BrainCircuit],
  ["Proof-to-paid", "Worker photos and notes become an AI summary, draft invoice, and approval flow.", ReceiptText],
  ["AI crew matching", "Match workers by area, availability, workload, job history, and schedule conflicts.", UsersRound],
  ["CSV imports", "Bulk import clients and workers with AI column mapping, duplicate checks, and invite preparation.", FileSpreadsheet],
  ["Dispatch map", "See job pins, unassigned work, worker check-ins, nearby matches, and suburb clusters.", Map],
  ["Timesheets & Pay Export", "Review worker time, approve hours, create pay summaries, and export for payroll handoff.", ClipboardCheck],
];

const modes = [
  ["AI Off", "Manual app only."],
  ["AI Assist", "AI explains, searches, and navigates."],
  ["AI Prepare", "AI prepares actions. Owner approves."],
  ["AI Operator", "AI scans the business and builds the queue."],
  ["AI Auto-Safe", "Only owner-approved safe actions run automatically."],
];

function Logo() {
  return (
    <div className="pw-logo">
      <svg viewBox="0 0 120 120">
        <defs>
          <linearGradient id="pwLogo" x1="10" y1="8" x2="112" y2="112">
            <stop stopColor="#08090B" />
            <stop offset=".45" stopColor="#FF6B35" />
            <stop offset=".76" stopColor="#20E3B2" />
            <stop offset="1" stopColor="#FFD166" />
          </linearGradient>
        </defs>
        <rect x="7" y="7" width="106" height="106" rx="31" fill="url(#pwLogo)" />
        <path d="M79 34a34 34 0 1 0 0 52" stroke="#FFFDF8" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M42 60h42" stroke="#FFD166" strokeWidth="12" strokeLinecap="round" />
        <path d="M68 42l20 18-20 18" stroke="#20E3B2" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span>Churvox</span>
    </div>
  );
}

export default function PublicWebsitePage() {
  return (
    <main className="pw">
      <header className="pw-nav">
        <Logo />
        <nav>
          <a href="#ai">AI Operator</a>
          <a href="#features">Features</a>
          <a href="#worker">Worker app</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="pw-nav-actions">
          <a href="/login">Login</a>
          <a className="pw-btn" href="/signup">Start free</a>
        </div>
      </header>

      <section className="pw-hero">
        <div className="pw-hero-copy">
          <p className="pw-kicker"><Sparkles size={16} /> Churvox Operator OS</p>
          <h1>The AI command centre for trade businesses.</h1>
          <p>
            Churvox prepares the admin, finds risks, drafts invoices, matches crew, imports bulk data,
            and waits for owner approval. Workers just do the work.
          </p>
          <div className="pw-actions">
            <a className="pw-btn" href="/signup">Start building <ArrowRight size={18} /></a>
            <a className="pw-btn ghost" href="#demo">See how it works</a>
          </div>
          <div className="pw-trust">
            <span><CheckCircle2 size={16} /> Approval-first AI</span>
            <span><CheckCircle2 size={16} /> CSV imports</span>
            <span><CheckCircle2 size={16} /> Worker proof-to-paid</span>
          </div>
        </div>

        <div className="pw-operator" id="ai">
          <div className="pw-operator-top">
            <div><span>Today’s command</span><strong>8 moves ready</strong></div>
            <Bot size={38} />
          </div>
          <div className="pw-moves">
            <div><b>Assign Mike to Naenae lawn job</b><span>94% match · same area · free today</span></div>
            <div><b>Draft invoice for completed job</b><span>Worker proof ready · $180 estimate</span></div>
            <div><b>Follow up overdue invoice</b><span>9 days overdue · message prepared</span></div>
            <div><b>Import 230 clients from CSV</b><span>AI mapped columns and found 6 duplicates</span></div>
          </div>
          <div className="pw-operator-actions">
            <button>Approve safe moves</button>
            <button>Review risky moves</button>
          </div>
        </div>
      </section>

      <section className="pw-strip">
        <div><b>Jobs</b><span>Assign, schedule, complete</span></div>
        <div><b>Cash</b><span>Quotes, invoices, MYOB</span></div>
        <div><b>Crew</b><span>Workers, time, pay export</span></div>
        <div><b>Clients</b><span>Memory, history, imports</span></div>
      </section>

      <section className="pw-section" id="demo">
        <p className="pw-kicker"><Zap size={16} /> Watch Churvox run a day</p>
        <h2>Not another dashboard. An operator that prepares the work.</h2>
        <div className="pw-day">
          <article><b>7:30 AM</b><h3>AI prepares today</h3><p>Unassigned jobs, overdue invoices, missing proof, and crew gaps are found.</p></article>
          <article><b>8:10 AM</b><h3>Owner approves</h3><p>Assignments, reminders, and invoice drafts are reviewed before anything is sent.</p></article>
          <article><b>10:45 AM</b><h3>Worker completes job</h3><p>Photos, time, GPS start evidence, and final note flow back to the office.</p></article>
          <article><b>11:00 AM</b><h3>Proof becomes invoice</h3><p>AI prepares invoice wording and marks the job ready for approval.</p></article>
        </div>
      </section>

      <section className="pw-section" id="features">
        <p className="pw-kicker"><BrainCircuit size={16} /> Built around AI admin</p>
        <h2>Everything important, prepared before the owner has to chase it.</h2>
        <div className="pw-features">
          {features.map(([title, text, Icon]) => (
            <article key={title}>
              <Icon size={25} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pw-split">
        <div className="pw-copy">
          <p className="pw-kicker"><Map size={16} /> Dispatch map</p>
          <h2>See work, crew, and risk by location.</h2>
          <p>Job pins, unassigned work, worker start/check-in locations, nearby match suggestions, and suburb clusters. Powerful dispatch without creepy all-day tracking.</p>
          <ul>
            <li>Job and worker map view</li>
            <li>Nearby worker suggestions</li>
            <li>Schedule clash warnings</li>
            <li>Google Maps navigation for workers</li>
          </ul>
        </div>
        <div className="pw-map">
          <span className="pin orange">Job</span>
          <span className="pin mint">Mike</span>
          <span className="pin gold">Unassigned</span>
          <div><b>Best match: Mike · 94%</b><small>8 minutes away · lawn experience · free this morning</small></div>
        </div>
      </section>

      <section className="pw-split worker" id="worker">
        <div className="pw-phone">
          <span>Worker command</span>
          <h3>Next job first</h3>
          <p>12 Main Road · Lawn care · Today 9:30 AM</p>
          <button><Navigation size={16} /> Navigate</button>
          <button><Hammer size={16} /> Start job</button>
          <small>□ Before photo</small>
          <small>□ After photo</small>
          <small>□ Final note</small>
          <small>□ Complete job</small>
        </div>
        <div className="pw-copy">
          <p className="pw-kicker"><Hammer size={16} /> Worker app</p>
          <h2>Workers get a job machine, not a complicated app.</h2>
          <p>Navigate, start, pause, upload proof, add notes, report issues, complete, and move to the next job. The office gets time, proof, and invoice-ready context.</p>
        </div>
      </section>

      <section className="pw-section">
        <p className="pw-kicker"><ShieldCheck size={16} /> Owner stays in control</p>
        <h2>Choose how much AI can do.</h2>
        <div className="pw-modes">
          {modes.map(([name, text]) => <article key={name}><b>{name}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="pw-section" id="pricing">
        <p className="pw-kicker"><WalletCards size={16} /> Pricing</p>
        <h2>Simple plans for real trade businesses.</h2>
        <div className="pw-pricing">
          {[
            ["Solo", "$30", "For one-person operators."],
            ["Team", "$70", "For small crews."],
            ["Pro", "$110", "For growing teams."],
            ["Enterprise", "$240", "For larger operations."],
          ].map(([name, price, text]) => (
            <article key={name}><h3>{name}</h3><strong>{price}<span>/mo</span></strong><p>{text}</p><a href="/signup">Choose {name}</a></article>
          ))}
        </div>
      </section>

      <section className="pw-contact" id="contact">
        <div>
          <p className="pw-kicker"><MessageSquareText size={16} /> Contact Churvox</p>
          <h2>Ready to build your AI-run trade business?</h2>
          <p>Email <a href="mailto:hello@churvox.com">hello@churvox.com</a> or create an account and start setting up your business.</p>
        </div>
        <a className="pw-btn" href="/signup">Start free</a>
      </section>

      <footer className="pw-footer">
        <Logo />
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/account-deletion">Account deletion</a>
          <a href="mailto:hello@churvox.com">Contact</a>
        </div>
      </footer>
    </main>
  );
}
