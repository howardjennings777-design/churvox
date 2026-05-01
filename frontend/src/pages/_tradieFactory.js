import { useEffect, useMemo, useState } from 'react';
import ModernButton from '../components/modern/ModernButton';
import ModernCard from '../components/modern/ModernCard';
import ModernActionCard from '../components/modern/ModernActionCard';
import ModernEmptyState from '../components/modern/ModernEmptyState';
import ModernLoadingState from '../components/modern/ModernLoadingState';
import ModernPage from '../components/modern/ModernPage';
import ModernPageHeader from '../components/modern/ModernPageHeader';
import ModernStatCard from '../components/modern/ModernStatCard';
import { apiFetch } from '../api/client';

const AI_COPY = {
  Jobs: 'Suggested next action: confirm assignment and start window before dispatch. Approval required before any outbound update.',
  Invoices: 'Suggested follow-up: draft a polite payment reminder for overdue balances. Approval required before send.',
  Quotes: 'Suggested follow-up: draft a same-day quote check-in with clear expiry and next steps. Approval required before send.',
  Clients: 'Suggested summary: generate a client activity recap before your next callout. Approval required before share.',
  Automation: 'Suggested rule: remind overdue invoice clients 48 hours after due date. Keep every automation approval-first.',
};

export function SimpleDataPage({ title, subtitle, endpoint, createTo, secondary }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(endpoint)
      .then((r) => setData(Array.isArray(r) ? r : r?.items || r?.results || []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const summary = useMemo(() => ({
    total: data.length,
    open: data.filter((item) => !['completed', 'paid', 'accepted', 'declined', 'cancelled'].includes(String(item.status || '').toLowerCase())).length,
  }), [data]);

  return (
    <ModernPage>
      <ModernPageHeader
        title={title}
        subtitle={subtitle}
        eyebrow="Tradie workspace"
        actions={<><ModernButton to={createTo || '#'}>Create</ModernButton>{secondary ? <ModernButton variant="secondary" to={secondary.to}>{secondary.label}</ModernButton> : null}</>}
      />

      <section className="modern-stats">
        <ModernStatCard label={`Total ${title.toLowerCase()}`} value={summary.total} />
        <ModernStatCard label="Active items" value={summary.open} hint="Live workload across your team" />
      </section>

      <section className="modern-record-layout">
        <ModernCard title={`${title} workspace`}>
          {loading ? <ModernLoadingState /> : null}
          {!loading && err ? <ModernEmptyState message="We couldn’t load this section." hint="Try refreshing or check your connection." /> : null}
          {!loading && !err && !data.length ? <ModernEmptyState message="No records yet." hint="Create your first record to get started." /> : null}
          {!loading && !err && data.length ? (
            <div className="modern-record-list">
              {data.slice(0, 20).map((item, i) => (
                <article key={item.id || i} className="modern-record-item">
                  <strong>{item.name || item.title || item.number || `Item ${i + 1}`}</strong>
                  <p>{item.address || item.email || item.phone || item.description || 'Details available in this record.'}</p>
                  <span>{item.status || 'Active'}</span>
                </article>
              ))}
            </div>
          ) : null}
        </ModernCard>

        <ModernActionCard
          title="AI helper"
          description={AI_COPY[title] || 'Review AI suggestions before applying changes. Approval-first always.'}
          ctaLabel="Review workflow"
          ctaTo={createTo || '#'}
          ctaVariant="ghost"
        />
      </section>
    </ModernPage>
  );
}
