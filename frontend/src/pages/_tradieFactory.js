import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import TradiePage from '../components/tradie/TradiePage';
import TradieHero from '../components/tradie/TradieHero';
import TradiePanel from '../components/tradie/TradiePanel';
import TradieEmptyState from '../components/tradie/TradieEmptyState';
import TradieLoadingState from '../components/tradie/TradieLoadingState';

export function SimpleDataPage({ title, subtitle, endpoint, createTo, secondary }) {
  // CHURVOX_TRADIE_V3_ACTIVE_PAGE
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(endpoint)
      .then((response) => {
        setData(Array.isArray(response) ? response : response?.items || response?.results || []);
      })
      .catch((error) => {
        console.log(error);
        setErr(true);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <TradiePage>
      <TradieHero
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Link className="btn" to={createTo || '#'}>
              Create
            </Link>
            {secondary && (
              <Link className="btn secondary" to={secondary.to}>
                {secondary.label}
              </Link>
            )}
          </>
        }
      />

      <TradiePanel title={`${title} List`}>
        {loading ? (
          <TradieLoadingState />
        ) : err ? (
          <TradieEmptyState />
        ) : data.length ? (
          <table>
            <tbody>
              {data.slice(0, 12).map((item, i) => (
                <tr key={item.id || i}>
                  <td>{item.name || item.title || item.number || `Item ${i + 1}`}</td>
                  <td>
                    <span className="badge warning">{item.status || 'Active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TradieEmptyState
            message="No records yet."
            hint="Add your first item to get started."
          />
        )}
      </TradiePanel>
    </TradiePage>
  );
}
