import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import TradiePage from '../components/tradie/TradiePage';
import TradieHero from '../components/tradie/TradieHero';
import TradiePanel from '../components/tradie/TradiePanel';
import TradieEmptyState from '../components/tradie/TradieEmptyState';
// CHURVOX_TRADIE_V3_ACTIVE_PAGE
export default function SmartHubPage(){
 const [stats,setStats]=useState({jobs:0,clients:0,invoices:0,quotes:0}); const [jobs,setJobs]=useState([]); const [err,setErr]=useState(false);
 useEffect(()=>{Promise.allSettled([apiFetch('/jobs'),apiFetch('/clients'),apiFetch('/invoices'),apiFetch('/quotes')]).then(([j,c,i,q])=>{const gv=r=>r.status==='fulfilled'?(Array.isArray(r.value)?r.value:(r.value?.items||r.value?.results||[])):[]; const jobs=gv(j),clients=gv(c),invoices=gv(i),quotes=gv(q); setJobs(jobs.slice(0,5)); setStats({jobs:jobs.length,clients:clients.length,invoices:invoices.length,quotes:quotes.length}); setErr([j,c,i,q].every(r=>r.status==='rejected')); if(j.status==='rejected') console.log(j.reason);});},[]);
 return <TradiePage><TradieHero title='Smart Hub' subtitle='Today’s jobs, customers, invoices, and actions in one place.' actions={<><Link className='btn' to='/jobs/new'>Create Job</Link> <Link className='btn secondary' to='/clients'>Add Client</Link></>} />
 <div className='strip'><div className='stat'><strong>Jobs today</strong><div>{stats.jobs}</div></div><div className='stat'><strong>Active clients</strong><div>{stats.clients}</div></div><div className='stat'><strong>Open invoices</strong><div>{stats.invoices}</div></div><div className='stat'><strong>Quotes pending</strong><div>{stats.quotes}</div></div></div>
 <TradiePanel title="Today's Focus">{err?<TradieEmptyState/>:<p>Keep momentum on in-progress jobs and follow up overdue invoices.</p>}</TradiePanel>
 <TradiePanel title='Recent jobs'>{jobs.length?<table><tbody>{jobs.map((j,idx)=><tr key={j.id||idx}><td>{j.title||j.job_name||`Job ${idx+1}`}</td><td><span className='badge success'>{j.status||'In progress'}</span></td></tr>)}</tbody></table>:<TradieEmptyState message='No recent jobs.' hint='Create a job to start your day.'/></TradiePanel>
 </TradiePage>
}
