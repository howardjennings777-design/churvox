import React from 'react';
import { Link } from 'react-router-dom';
import SmartHubErrorBoundary from '../components/SmartHubErrorBoundary';

function CommandCleanupDashboard() {
  const links = [
    ['/jobs', 'Jobs'],
    ['/clients', 'Clients'],
    ['/quotes', 'Quotes'],
    ['/invoices', 'Invoices'],
    ['/team', 'Team'],
    ['/payroll', 'Payroll'],
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#101820,#18232d 55%,#202b35)', color: '#f4f7f8', padding: 28, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 16 }}>
        <article style={{ border: '1px solid #4f5f6b', borderRadius: 24, padding: 28, background: 'linear-gradient(145deg,#26323d,#1b252e)', boxShadow: '0 22px 70px rgba(0,0,0,.32)' }}>
          <p style={{ margin: '0 0 10px', color: '#65d1d6', textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 11, fontWeight: 950 }}>Churvox AI Operator</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px,5vw,72px)', lineHeight: '.9', letterSpacing: '-.06em' }}>Clean command desk active.</h1>
          <p style={{ color: '#aeb9c2', maxWidth: 760, lineHeight: 1.5 }}>The failed old dashboard/theme attempts are no longer active. This is a safe clean base for the full proper redesign.</p>
        </article>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          {links.map(([to, label]) => (
            <Link key={to} to={to} style={{ color: '#f4f7f8', textDecoration: 'none', border: '1px solid #4f5f6b', borderRadius: 16, padding: 16, background: 'linear-gradient(180deg,#25313b,#1b252e)', fontWeight: 900 }}>{label}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <CommandCleanupDashboard />
    </SmartHubErrorBoundary>
  );
}
