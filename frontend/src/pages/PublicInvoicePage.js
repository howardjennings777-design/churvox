import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/public/invoice/${token}`).then(setData).catch(() => setErr('Invoice unavailable right now.')).finally(() => setLoading(false));
  }, [token]);

  return <div className="auth-wrap"><div className="auth-card"><h1>Invoice</h1>{loading ? <p>Loading invoice…</p> : err ? <p>{err}</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}<p>Secure payment flow remains active.</p></div></div>;
}
