import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
// CHURVOX_NEW_REAL_PAGE_ACTIVE
export default function PlansPage(){
 const {user,login,signup}=useAuth()||{}; const {id,token}=useParams(); const nav=useNavigate?.();
 const [data,setData]=useState(null); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false);
 const [form,setForm]=useState({email:'',password:'',name:''});
 const key='PlansPage';
 useEffect(()=>{const map={SmartHubPage:'/dashboard/summary',ClientsPage:'/clients',ClientDetailPage:'/clients/'+id,JobsPage:'/jobs',JobDetailPage:'/jobs/'+id,QuotesPage:'/quotes',QuoteDetailPage:'/quotes/'+id,InvoicesPage:'/invoices',InvoiceDetailPage:'/invoices/'+id,TeamPage:'/team',WorkerDashboardPage:'/worker/jobs',WorkerJobDetailPage:'/worker/jobs/'+id,PayrollPage:'/timesheets',AutomationPage:'/automation',ReportsPage:'/reports',SettingsPage:'/settings',PlansPage:'/plans',CommunicationsPage:'/sms',IntegrationsPage:'/integrations',PublicQuotePage:'/public/quote/'+token,PublicInvoicePage:'/public/invoice/'+token}[key]; if(!map) return; setLoading(true); apiFetch(map).then(setData).catch(e=>setErr(String(e))).finally(()=>setLoading(false));},[id,token,key]);
 if(key==='LoginPage') return <div className='panel'><h1>Login</h1><input placeholder='email' onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder='password' type='password' onChange={e=>setForm({...form,password:e.target.value})}/><button onClick={async()=>{await login(form);nav('/smart-hub')}}>Login</button><Link to='/signup'>Signup</Link></div>;
 if(key==='SignupPage') return <div className='panel'><h1>Signup</h1><input placeholder='name' onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder='email' onChange={e=>setForm({...form,email:e.target.value})}/><input type='password' placeholder='password' onChange={e=>setForm({...form,password:e.target.value})}/><button onClick={async()=>{await signup(form);nav('/login')}}>Create account</button></div>;
 return <div className='panel'><h1>{key.replace('Page','')}</h1>{loading&&<p>Loading...</p>}{err&&<p>{err}</p>}<pre>{JSON.stringify(data,null,2)}</pre>{!loading&&!err&&!data&&<p>No data yet</p>}</div>
}
