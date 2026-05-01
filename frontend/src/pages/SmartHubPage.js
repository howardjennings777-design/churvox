import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ModernBadge from '../components/modern/ModernBadge';
import ModernButton from '../components/modern/ModernButton';
import ModernCard from '../components/modern/ModernCard';
import ModernEmptyState from '../components/modern/ModernEmptyState';
import ModernHero from '../components/modern/ModernHero';
import ModernPage from '../components/modern/ModernPage';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function SmartHubPage() {
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [] });
  useEffect(() => {
    Promise.allSettled([apiFetch('/jobs'), apiFetch('/clients'), apiFetch('/invoices'), apiFetch('/quotes')]).then((responses) => {
      const parse = (x) => (x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : x.value?.items || x.value?.results || []) : []);
      setData({ jobs: parse(responses[0]), clients: parse(responses[1]), invoices: parse(responses[2]), quotes: parse(responses[3]) });
    });
  }, []);
  const stats = useMemo(() => ({
    activeJobs: data.jobs.filter((j) => !['completed', 'cancelled'].includes((j.status || '').toLowerCase())).length,
    activeClients: data.clients.length,
    openInvoices: data.invoices.filter((i) => (i.status || '').toLowerCase() !== 'paid').length,
    pendingQuotes: data.quotes.filter((q) => !['accepted', 'declined'].includes((q.status || '').toLowerCase())).length,
  }), [data]);

  return (
    <ModernPage>
      <ModernHero
        title="Smart Hub"
        subtitle="Run today’s jobs, customers, invoices, and team activity from one clear place."
        actions={<><ModernButton as={Link} to="/jobs/new">Create Job</ModernButton><ModernButton as={Link} variant="secondary" to="/clients">Add Client</ModernButton><ModernButton as={Link} variant="ghost" to="/invoices">Create Invoice</ModernButton></>}
      />
      <section className="modern-stats"><article className="modern-stat"><p>Active jobs</p><strong>{stats.activeJobs}</strong></article><article className="modern-stat"><p>Active clients</p><strong>{stats.activeClients}</strong></article><article className="modern-stat"><p>Open invoices</p><strong>{stats.openInvoices}</strong></article><article className="modern-stat"><p>Pending quotes</p><strong>{stats.pendingQuotes}</strong></article></section>
      <ModernCard title="Today’s Run Sheet">
        {data.jobs.length ? data.jobs.slice(0, 6).map((job, i) => <div key={job.id || i} className="modern-topbar"><div><strong>{job.title || job.job_name || `Job ${i + 1}`}</strong><p>{job.address || 'Address pending'}</p></div><ModernBadge tone="info">{job.status || 'scheduled'}</ModernBadge></div>) : <ModernEmptyState message="No jobs scheduled yet." hint="Create your first job to begin." />}
      </ModernCard>
    </ModernPage>
  );
}
