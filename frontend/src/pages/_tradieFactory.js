import { useEffect, useState } from 'react';
import ModernButton from '../components/modern/ModernButton';
import ModernCard from '../components/modern/ModernCard';
import ModernEmptyState from '../components/modern/ModernEmptyState';
import ModernHero from '../components/modern/ModernHero';
import ModernLoadingState from '../components/modern/ModernLoadingState';
import ModernPage from '../components/modern/ModernPage';
import ModernTable from '../components/modern/ModernTable';
import { apiFetch } from '../api/client';

export function SimpleDataPage({ title, subtitle, endpoint, createTo, secondary }) {
  // CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setLoading(true);
    apiFetch(endpoint)
      .then((r) => setData(Array.isArray(r) ? r : r?.items || r?.results || []))
      .catch((e) => {
        console.log(e);
        setErr(true);
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <ModernPage>
      <ModernHero
        title={title}
        subtitle={subtitle}
        actions={<><ModernButton to={createTo || '#'}>Create</ModernButton>{secondary ? <ModernButton variant="secondary" to={secondary.to}>{secondary.label}</ModernButton> : null}</>}
      />
      <ModernCard title={`${title} List`}>
        {loading ? <ModernLoadingState /> : null}
        {!loading && err ? <ModernEmptyState message="We couldn’t load this section." hint="Try refreshing or check your connection." /> : null}
        {!loading && !err && !data.length ? <ModernEmptyState message="No records yet." hint="Create your first record to get started." /> : null}
        {!loading && !err && data.length ? (
          <ModernTable
            columns={[title, 'Status']}
            rows={data.slice(0, 20).map((item, i) => (
              <tr key={item.id || i}><td>{item.name || item.title || item.number || `Item ${i + 1}`}</td><td>{item.status || 'Active'}</td></tr>
            ))}
          />
        ) : null}
      </ModernCard>
    </ModernPage>
  );
}
