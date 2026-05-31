import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumAIDraftPanel } from '@/components/premium';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';

const STEPS = ['Welcome', 'Business setup', 'Team/workflow', 'AI recommendations', 'Finish'];

const launchSteps = [
  { key: 'business', title: 'Finish business profile', href: '/settings', why: 'Invoices, quotes and customer trust need your business details.' },
  { key: 'plan', title: 'Confirm your plan', href: '/plans', why: 'Make sure trial, billing and plan limits are clear before launch.' },
  { key: 'client', title: 'Add your first client', href: '/clients', why: 'Clients are the base for jobs, quotes and invoices.' },
  { key: 'job', title: 'Create your first job', href: '/jobs', why: 'This starts the real field workflow.' },
  { key: 'worker', title: 'Invite or add your first worker', href: '/team', why: 'Dispatch, crew ops and worker completion need a worker record.' },
  { key: 'invoice', title: 'Create your first invoice', href: '/invoices', why: 'Money Desk and Reports become useful once invoices exist.' },
  { key: 'demo', title: 'Create demo sample data', href: '/demo-mode', why: 'Use sample data for screenshots, sales demos and full workflow practice.' },
  { key: 'ai', title: 'Review AI Operator actions', href: '/ai-operator', why: 'Churvox prepares admin; you approve the important actions.' },
  { key: 'trust', title: 'Review trust and support', href: '/contact', why: 'Know where support, privacy, data control and help live.' },
  { key: 'salespolish', title: 'Review sales message', href: '/sales-polish', why: 'Make sure the public promise is clear: Churvox does the admin. You approve.' },
  { key: 'integrationproof', title: 'Review integration proof', href: '/integration-proof', why: 'Check email, Stripe, MYOB, SMS and public invoice readiness.' },
  { key: 'launchops', title: 'Review launch operations', href: '/launch-ops', why: 'Know the daily admin routine for running Churvox.' },
  { key: 'backup', title: 'Review backup and recovery', href: '/backup-recovery', why: 'Know what to do if deployment, database or integrations break.' },
  { key: 'polish', title: 'Review final polish checklist', href: '/polish-checklist', why: 'Track the last 10% that makes the app feel top-tier.' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const [step, setStep] = useState(0);
  const [setupCounts, setSetupCounts] = useState({ clients: 0, jobs: 0, invoices: 0, workers: 0 });
  const [form, setForm] = useState({ business_name: '', industry: '', region: '', main_service_type: '', team_size: '1', uses_myob: false, sms_later: false });

  useEffect(() => {
    (async () => {
      const status = await get('/onboarding/status');
      if (status?.success) {
        const d = status.data || {};
        if (d.onboarding_completed || normalizedRole === 'worker') navigate('/dashboard');
        if (d.form && typeof d.form === 'object') setForm((f) => ({ ...f, ...d.form }));
      }

      const [clients, jobs, invoices, workers] = await Promise.allSettled([
        get('/clients'),
        get('/jobs'),
        get('/invoices'),
        get('/team/workers'),
      ]);

      const count = (result) => {
        if (result.status !== 'fulfilled') return 0;
        const value = result.value?.data || result.value || {};
        if (Array.isArray(value)) return value.length;
        for (const key of ['clients', 'jobs', 'invoices', 'workers', 'items', 'data']) {
          if (Array.isArray(value[key])) return value[key].length;
        }
        return 0;
      };

      setSetupCounts({ clients: count(clients), jobs: count(jobs), invoices: count(invoices), workers: count(workers) });
    })();
  }, [get, navigate, normalizedRole]);

  const save = async () => { await post('/onboarding/save', { ...form, step }); };
  const complete = async () => { await post('/onboarding/complete', { ...form }); navigate('/dashboard'); };

  const completedKeys = useMemo(() => {
    const done = new Set();
    if (form.business_name || user?.business_name || user?.company_name) done.add('business');
    if (user?.plan || user?.selected_plan || user?.plan_status || user?.subscription_status) done.add('plan');
    if (setupCounts.clients > 0) done.add('client');
    if (setupCounts.jobs > 0) done.add('job');
    if (setupCounts.workers > 0) done.add('worker');
    if (setupCounts.invoices > 0) done.add('invoice');
    done.add('demo');
    done.add('ai');
    done.add('trust');
    done.add('polish');
    done.add('backup');
    done.add('launchops');
    done.add('integrationproof');
    done.add('salespolish');
    return done;
  }, [form.business_name, setupCounts, user]);

  const percent = Math.round((completedKeys.size / launchSteps.length) * 100);
  const nextLaunchStep = launchSteps.find((item) => !completedKeys.has(item.key));
  const context = useMemo(() => ({ role: normalizedRole, form, setupCounts }), [normalizedRole, form, setupCounts]);

  return <Layout><PremiumPage>
    <PremiumHero title="Get Churvox ready for real work" subtitle="Finish the simple setup path: business details, first client, first job, worker, invoice, trust and AI approval flow." />

    <PremiumCard title="Launch readiness checklist">
      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Setup progress</p>
            <h2 className="text-3xl font-black text-slate-950">{percent}% ready</h2>
            <p className="text-sm font-semibold text-slate-600">{completedKeys.size} of {launchSteps.length} launch steps complete.</p>
          </div>
          {nextLaunchStep ? <Link className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white" to={nextLaunchStep.href}>Next: {nextLaunchStep.title}</Link> : <Link className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white" to="/dashboard">Open Command Floor</Link>}
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {launchSteps.map((item) => {
          const done = completedKeys.has(item.key);
          return <Link key={item.key} to={item.href} className={`rounded-3xl border p-4 no-underline shadow-sm ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${done ? 'text-emerald-700' : 'text-blue-700'}`}>{done ? 'Done' : 'Next'}</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">{item.why}</p>
          </Link>;
        })}
      </div>
    </PremiumCard>

    <PremiumCard title={`Guided setup form: ${STEPS[step]}`}>
      {step === 0 && <p className='text-sm text-[#5b6c87]'>Use this guided form for better defaults, or jump straight into the checklist above.</p>}
      {step === 1 && <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
        <input className='px-input' placeholder='Business name' value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} />
        <select className='px-input' value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}><option value=''>Industry/trade</option><option>Electrical</option><option>Plumbing</option><option>HVAC</option><option>Landscaping</option><option>General services</option></select>
        <input className='px-input' placeholder='Region/location' value={form.region} onChange={e=>setForm({...form,region:e.target.value})} />
        <input className='px-input' placeholder='Main service type' value={form.main_service_type} onChange={e=>setForm({...form,main_service_type:e.target.value})} />
      </div>}
      {step === 2 && <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
        <select className='px-input' value={form.team_size} onChange={e=>setForm({...form,team_size:e.target.value})}><option value='1'>1</option><option value='2-5'>2-5</option><option value='6-15'>6-15</option><option value='16+'>16+</option></select>
        <label className='text-sm'><input type='checkbox' checked={form.uses_myob} onChange={e=>setForm({...form,uses_myob:e.target.checked})}/> Uses MYOB</label>
        <label className='text-sm'><input type='checkbox' checked={form.sms_later} onChange={e=>setForm({...form,sms_later:e.target.checked})}/> Wants SMS reminders later</label>
      </div>}
      {step === 3 && <PremiumAIDraftPanel title='AI Setup Guide' subtitle='Suggested templates, automations, invoicing, import flow and roles.' surface='onboarding' context={context} defaultPrompt='Create a concise setup checklist with first-week actions. Include MYOB later steps if selected.' quickActions={[{label:'Setup guide',prompt:'Create a concise onboarding setup guide.'},{label:'Automation ideas',prompt:'Suggest safe first automations only.'},{label:'Owner summary',prompt:'Summarise best first actions for the owner.'}]} />}
      {step === 4 && <p className='text-sm text-[#5b6c87]'>All set. You can finish now and go to Command Floor.</p>}
      <div className='mt-3 flex flex-wrap gap-2'>
        <PremiumButton variant='secondary' onClick={save}>Save progress</PremiumButton>
        <PremiumButton variant='ghost' onClick={() => navigate('/dashboard')}>Skip for now</PremiumButton>
        {step > 0 ? <PremiumButton variant='secondary' onClick={() => setStep(step - 1)}>Back</PremiumButton> : null}
        {step < STEPS.length - 1 ? <PremiumButton onClick={() => setStep(step + 1)}>Next</PremiumButton> : <PremiumButton onClick={complete}>Finish</PremiumButton>}
      </div>
    </PremiumCard>
  </PremiumPage></Layout>;
}
