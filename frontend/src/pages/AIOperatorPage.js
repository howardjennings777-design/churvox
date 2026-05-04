import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { get, post } from '../lib/api';

export default function AIOperatorPage() {
  const [actions, setActions] = useState([]);
  const [health, setHealth] = useState(null);
  const load = async () => {
    const [a, h] = await Promise.all([get('/ai/operator/actions').catch(()=>({actions:[]})), get('/ai/operator/business-health').catch(()=>null)]);
    setActions(a?.actions || []); setHealth(h);
  };
  useEffect(()=>{ load(); },[]);
  return <Layout><div className='p-4 space-y-4'>
    <div className='bg-white rounded-2xl shadow p-4 border'><h1 className='text-2xl font-semibold'>AI Operator</h1><p className='text-sm text-slate-600'>Churvox prepares the admin. You approve what happens next.</p><div className='mt-3 flex gap-2'><button className='px-3 py-2 rounded bg-blue-600 text-white text-sm' onClick={async()=>{await post('/ai/operator/run-daily-check',{}); await load();}}>Run Daily Check</button><button className='px-3 py-2 rounded border text-sm' onClick={async()=>{await post('/ai/operator/prepare-today',{}); await load();}}>Prepare Today</button></div></div>
    {health && <div className='bg-white rounded-2xl shadow p-4 border'><p className='font-medium'>Business Health: {health.score} ({health.label})</p><p className='text-xs text-slate-600'>{(health.risks||[]).join(' • ')}</p></div>}
    <div className='space-y-2'>{actions.map((a)=><div key={a.id||a._id} className='bg-white rounded-xl border p-3'><p className='font-medium'>{a.title||a.type}</p><p className='text-xs text-slate-600'>{a.summary||a.recommendation}</p><div className='mt-2 flex gap-2'><button className='px-2 py-1 text-xs rounded bg-blue-600 text-white' onClick={async()=>{await post(`/ai/operator/actions/${a.id||a._id}/approve`,{}); await load();}}>Approve</button><button className='px-2 py-1 text-xs rounded border' onClick={async()=>{await post(`/ai/operator/actions/${a.id||a._id}/dismiss`,{}); await load();}}>Dismiss</button></div></div>)}</div>
  </div></Layout>;
}
