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
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], team: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch('/jobs'),
      apiFetch('/clients'),
      apiFetch('/invoices'),
      apiFetch('/quotes'),
      apiFetch('/team').catch(() => []),
    ])
      .then((responses) => {
        if (!active) return;
        const parse = (x) => (x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : x.value?.items || x.value?.results || []) : []);
        const next = {
          jobs: parse(responses[0]),
          clients: parse(responses[1]),
          invoices: parse(responses[2]),
          quotes: parse(responses[3]),
          team: parse(responses[4]),
        };
        if (!next.jobs.length && !next.clients.length && !next.invoices.length && !next.quotes.length) {
          setError('No business data returned yet. You can still start with quick actions below.');
        }
        setData(next);
      })
      .catch(() => {
        if (active) setError('We could not load your latest Smart Hub data. Please refresh.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const openJobs = data.jobs.filter((j) => !['completed', 'cancelled'].includes((j.status || '').toLowerCase()));
    const unassignedJobs = openJobs.filter((j) => !j.assigned_to && !j.assignee_id && !j.worker_id);
    const urgentJobs = openJobs.filter((j) => ['urgent', 'high', 'asap'].includes((j.priority || '').toLowerCase()));
    const openInvoices = data.invoices.filter((i) => !['paid', 'void'].includes((i.status || '').toLowerCase()));
    const overdueInvoices = openInvoices.filter((i) => ['overdue', 'past_due'].includes((i.status || '').toLowerCase()));
    const pendingQuotes = data.quotes.filter((q) => !['accepted', 'declined'].includes((q.status || '').toLowerCase()));

    return {
      openJobs,
      unassignedJobs,
      urgentJobs,
      openInvoices,
      overdueInvoices,
      pendingQuotes,
    };
  }, [data]);

  const aiSuggestions = [
    summary.unassignedJobs.length ? `${summary.unassignedJobs.length} unassigned job${summary.unassignedJobs.length > 1 ? 's' : ''} need dispatch assignment.` : null,
    summary.overdueInvoices.length ? `${summary.overdueInvoices.length} overdue invoice${summary.overdueInvoices.length > 1 ? 's' : ''} should get follow-up reminders.` : null,
    summary.pendingQuotes.length ? `${summary.pendingQuotes.length} pending quote${summary.pendingQuotes.length > 1 ? 's' : ''} may need a same-day check-in.` : null,
    summary.urgentJobs.length ? `${summary.urgentJobs.length} urgent job${summary.urgentJobs.length > 1 ? 's are' : ' is'} flagged for priority scheduling.` : null,
  ].filter(Boolean);

  return (
    <ModernPage>
      <ModernHero
        title="Smart Hub"
        subtitle="Your tradie command centre for jobs, dispatch, clients, cashflow, and daily execution."
        actions={<><ModernButton as={Link} to="/jobs/new">Create Job</ModernButton><ModernButton as={Link} variant="secondary" to="/clients">Add Client</ModernButton><ModernButton as={Link} variant="ghost" to="/invoices">Create Invoice</ModernButton></>}
      />

      {error ? <ModernCard><p className="modern-hub-warning">{error}</p></ModernCard> : null}

      <section className="modern-hub-grid">
        <div className="modern-hub-main">
          <section className="modern-stats modern-hub-stats">
            <article className="modern-stat"><p>Active jobs</p><strong>{summary.openJobs.length}</strong></article>
            <article className="modern-stat"><p>Today’s run sheet</p><strong>{data.jobs.slice(0, 8).length}</strong></article>
            <article className="modern-stat"><p>Open invoices</p><strong>{summary.openInvoices.length}</strong></article>
            <article className="modern-stat"><p>Pending quotes</p><strong>{summary.pendingQuotes.length}</strong></article>
          </section>

          <ModernCard title="Active jobs + dispatch">
            {loading ? <p className="modern-loading">Loading jobs…</p> : summary.openJobs.length ? summary.openJobs.slice(0, 5).map((job, i) => (
              <div key={job.id || i} className="modern-topbar modern-hub-row">
                <div>
                  <strong>{job.title || job.job_name || `Job ${i + 1}`}</strong>
                  <p>{job.address || job.suburb || 'Address pending'} · {job.scheduled_date || 'Date to schedule'}</p>
                </div>
                <ModernBadge tone={['urgent', 'high'].includes((job.priority || '').toLowerCase()) ? 'danger' : 'info'}>{job.status || 'scheduled'}</ModernBadge>
              </div>
            )) : <ModernEmptyState message="No active jobs right now." hint="Create a job to start your run sheet." />}
          </ModernCard>

          <div className="modern-hub-two-col">
            <ModernCard title="Clients">
              {loading ? <p className="modern-loading">Loading clients…</p> : data.clients.length ? data.clients.slice(0, 4).map((client, i) => <div key={client.id || i} className="modern-hub-list-item"><strong>{client.name || client.client_name || `Client ${i + 1}`}</strong><p>{client.phone || client.email || 'Contact details pending'}</p></div>) : <ModernEmptyState message="No clients yet." hint="Add your first client to begin." />}
            </ModernCard>

            <ModernCard title="Open invoices + pending quotes">
              {loading ? <p className="modern-loading">Loading invoices and quotes…</p> : (
                <>
                  <p className="modern-hub-kpi">Open invoices: <strong>{summary.openInvoices.length}</strong></p>
                  <p className="modern-hub-kpi">Pending quotes: <strong>{summary.pendingQuotes.length}</strong></p>
                  <p className="modern-hub-muted">Approval-first automation only — no messages send automatically.</p>
                </>
              )}
            </ModernCard>
          </div>
        </div>

        <aside className="modern-hub-ai">
          <ModernCard title="AI Business Assistant">
            <div className="modern-ai-panel">
              <h4>Today’s summary</h4>
              <p>{summary.openJobs.length} active jobs, {summary.openInvoices.length} open invoices, {summary.pendingQuotes.length} pending quotes. Review every draft before sending.</p>
            </div>
            <p className="modern-hub-muted">Business suggestions based on your current workload and cashflow.</p>
            {loading ? <p className="modern-loading">Analyzing your business…</p> : aiSuggestions.length ? (
              <div className="modern-section-soft">
                <ul className="modern-hub-ai-list">{aiSuggestions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : <ModernEmptyState message="No critical alerts right now." hint="Your operations look stable for today." />}

            <label className="modern-hub-label" htmlFor="assistantPrompt">Ask for help drafting follow-ups</label>
            <textarea id="assistantPrompt" className="modern-hub-textarea" value={assistantPrompt} onChange={(e) => setAssistantPrompt(e.target.value)} placeholder="e.g. Draft a friendly follow-up for overdue invoices due this week." />
            <div className="modern-hub-draft">
              <strong>Approval-first:</strong> No automatic customer messages are sent.
              <br />
              <strong>Draft preview (approval required):</strong>
              <p>{assistantPrompt ? `Draft for review: ${assistantPrompt}` : 'No draft started. Type a request to generate wording for review.'}</p>
            </div>
          </ModernCard>
        </aside>
      </section>
    </ModernPage>
  );
}
