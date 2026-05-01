import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import TradieBadge from '../components/tradie/TradieBadge';
import TradieButton from '../components/tradie/TradieButton';
import TradieEmptyState from '../components/tradie/TradieEmptyState';
import TradieHero from '../components/tradie/TradieHero';
import TradiePage from '../components/tradie/TradiePage';
import TradiePanel from '../components/tradie/TradiePanel';

export default function SmartHubPage() {
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [] });

  useEffect(() => {
    Promise.allSettled([
      apiFetch('/jobs'),
      apiFetch('/clients'),
      apiFetch('/invoices'),
      apiFetch('/quotes'),
    ]).then(([jobsRes, clientsRes, invoicesRes, quotesRes]) => {
      const resolveCollection = (result) => {
        if (result.status !== 'fulfilled') {
          console.log('Smart hub endpoint failure:', result.reason);
          return [];
        }
        if (Array.isArray(result.value)) {
          return result.value;
        }
        return result.value?.items || result.value?.results || [];
      };

      setData({
        jobs: resolveCollection(jobsRes),
        clients: resolveCollection(clientsRes),
        invoices: resolveCollection(invoicesRes),
        quotes: resolveCollection(quotesRes),
      });
    });
  }, []);

  const stats = useMemo(
    () => ({
      activeJobs: data.jobs.filter((job) => !['completed', 'cancelled'].includes((job.status || '').toLowerCase())).length,
      activeClients: data.clients.length,
      openInvoices: data.invoices.filter((invoice) => (invoice.status || '').toLowerCase() !== 'paid').length,
      pendingQuotes: data.quotes.filter((quote) => !['accepted', 'declined'].includes((quote.status || '').toLowerCase())).length,
    }),
    [data],
  );

  const latestJobs = data.jobs.slice(0, 5);

  return (
    <TradiePage>
      <TradieHero
        title="Smart Hub"
        subtitle="Run today’s jobs, customers, invoices, and team activity from one clear place."
        actions={
          <>
            <TradieButton as={Link} to="/jobs/new">Create Job</TradieButton>
            <TradieButton as={Link} to="/clients" variant="secondary">Add Client</TradieButton>
            <TradieButton as={Link} to="/invoices/new" variant="ghost">Create Invoice</TradieButton>
          </>
        }
      />

      <section className="strip">
        <article className="stat"><p>Active jobs</p><strong>{stats.activeJobs}</strong></article>
        <article className="stat"><p>Active clients</p><strong>{stats.activeClients}</strong></article>
        <article className="stat"><p>Open invoices</p><strong>{stats.openInvoices}</strong></article>
        <article className="stat"><p>Pending quotes</p><strong>{stats.pendingQuotes}</strong></article>
      </section>

      <TradiePanel title="Latest Work">
        {latestJobs.length === 0 ? (
          <TradieEmptyState message="No jobs scheduled yet." hint="Create your first job to start today’s run sheet." />
        ) : (
          <div className="tradie-list">
            {latestJobs.map((job, index) => (
              <article className="tradie-list-card" key={job.id || index}>
                <div>
                  <h4>{job.title || job.job_name || `Job ${index + 1}`}</h4>
                  <p>{job.address || job.site_address || 'Address to be confirmed'}</p>
                </div>
                <TradieBadge tone="info">{job.status || 'scheduled'}</TradieBadge>
              </article>
            ))}
          </div>
        )}
      </TradiePanel>
    </TradiePage>
  );
}
