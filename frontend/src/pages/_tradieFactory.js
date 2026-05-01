import { useEffect, useMemo, useState } from 'react';
import { PremiumActionCard, PremiumBadge, PremiumButton, PremiumCard, PremiumEmptyState, PremiumHeader, PremiumLoadingState, PremiumPage, PremiumStatCard } from '../components/PremiumUI';
import { apiFetch } from '../api/client';

const AI_COPY = {
  Payroll: 'AI payroll summary only: flag missing hours and approval gaps. Review before final export. No auto-payroll changes.',
  Reports: 'AI summary: highlight trend changes, risk signals, and opportunities. Human review required for decisions.',
  Plans: 'AI growth hint: compare usage vs plan limits before upgrading. Approval-first billing changes only.',
  Communications: 'AI messaging helper drafts outbound updates only. Review and approve before sending any customer SMS.',
  Integrations: 'AI integration assistant suggests sync checks and setup tasks. Confirm all accounting mappings manually.',
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
    <PremiumPage>
      <PremiumHeader
        title={title}
        subtitle={subtitle}
        eyebrow="Tradie workspace"
        actions={<><PremiumButton to={createTo || '#'}>Create</PremiumButton>{secondary ? <PremiumButton variant="secondary" to={secondary.to}>{secondary.label}</PremiumButton> : null}</>}
      />

      <section className="modern-stats">
        <PremiumStatCard label={`Total ${title.toLowerCase()}`} value={summary.total} />
        <PremiumStatCard label="Active items" value={summary.open} hint="Live workload across your team" />
      </section>

      <section className="modern-record-layout">
        <PremiumCard title={`${title} workspace`}>
          {loading ? <PremiumLoadingState /> : null}
          {!loading && err ? <PremiumEmptyState message="We couldn’t load this section." hint="Try refreshing or check your connection." /> : null}
          {!loading && !err && !data.length ? <PremiumEmptyState message="No records yet." hint="Create your first record to get started." /> : null}
          {!loading && !err && data.length ? (
            <div className="modern-record-list">
              {data.slice(0, 20).map((item, i) => (
                <article key={item.id || i} className="modern-record-item">
                  <strong>{item.name || item.title || item.number || `Item ${i + 1}`}</strong>
                  <p>{item.address || item.email || item.phone || item.description || 'Details available in this record.'}</p>
                  <PremiumBadge tone={String(item.status||'').toLowerCase().includes('complete')||String(item.status||'').toLowerCase().includes('paid')?'success':String(item.status||'').toLowerCase().includes('cancel')?'danger':String(item.status||'').toLowerCase().includes('pause')?'warning':'info'}>{item.status || 'Active'}</PremiumBadge>
                </article>
              ))}
            </div>
          ) : null}
        </PremiumCard>

        <PremiumActionCard
          title="AI helper"
          description={AI_COPY[title] || 'Review AI suggestions before applying changes. Approval-first always.'}
          ctaLabel="Review workflow"
          ctaTo={createTo || '#'}
          ctaVariant="ghost"
        />
      </section>
    </PremiumPage>
  );
}
