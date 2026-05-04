import React from 'react';
import { useParams } from 'react-router-dom';
export default function ClientPortalPage(){ const { token } = useParams(); return <div className='min-h-screen bg-slate-50 p-4'><div className='max-w-2xl mx-auto bg-white rounded-2xl border shadow p-4'><h1 className='text-xl font-semibold'>Client Portal</h1><p className='text-sm text-slate-600'>Secure proof-to-paid portal token: {token?.slice(0,8)}…</p></div></div>; }
