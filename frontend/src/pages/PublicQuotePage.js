import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function PublicQuotePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/public/quote/${token}`).then(setData).catch(() => setErr('Quote unavailable right now.')).finally(() => setLoading(false));
  }, [token]);

  return <div className="auth-wrap"><div className="auth-card"><h1>Quote</h1>{loading ? <p>Loading quote…</p> : err ? <p>{err}</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}<p>Review before approving.</p></div></div>;
}
