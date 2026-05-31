// CHURVOX_ONBOARDING_STABLE_SIGNUP_FLOW_20260601
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  { key: 'ai', title: 'Review AI Operator checks', href: '/automation', why: 'Churvox prepares admin checks from real jobs, quotes and invoices.' },
  { key: 'integrations', title: 'Review integrations', href: '/integrations', why: 'MYOB, SMS and email stay safe and connected to invoice readiness.' },
  { key: 'trust', title: 'Review trust and support', href: '/contact', why: 'Know where support, privacy, data control and help live.' },
];

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pickCount(result, keys = []) {
  if (result.status !== 'fulfilled') return 0;
  const value = result.value?.data || result.value || {};
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key].length;
    if (Array.isArray(value?.data?.[key])) return value.data[key].length;
  }
  return arr(value).length;
}

function loadLocalForm() {
  try {
    const saved = JSON.parse(localStorage.getItem('churvox_onboarding_form') || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function saveLocalForm(form) {
  try { localStorage.setItem('churvox_onboarding_form', JSON.stringify(form || {})); } catch {}
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get } = useApi();
  const [step, setStep] = useState(0);
  const [setupCounts, setSetupCounts] = useState({ clients: 0, jobs: 0, invoices: 0, workers: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [form, setForm] = useState(() => ({
    business_name: '',
    industry: '',
    region: '',
    main_service_type: '',
    team_size: '1',
    uses_myob: false,
    sms_later: false,
    ...loadLocalForm(),
  }));

  useEffect(() => {
    let alive = true;
    async function load() {
      if (normalizedRole === 'worker') {
        navigate('/worker/jobs');
        return;
      }

      setLoadingCounts(true);
      const [clients, jobs, invoices, workers] = await Promise.allSettled([
        get('/clients'),
        get('/jobs'),
        get('/invoices'),
        get('/team/workers'),
      ]);

      if (!alive) return;
      setSetupCounts({
        clients: pickCount(clients, ['clients', 'customers', 'items', 'results']),
        jobs: pickCount(jobs, ['jobs', 'items', 'results']),
        invoices: pickCount(invoices, ['invoices', 'items', 'results']),
        workers: pickCount(workers, ['workers', 'team', 'items', 'results']),
      });
      setLoadingCounts(false);
    }
    load();
    return () => { alive = false; };
  }, [get, navigate, normalizedRole]);

  const save = async () => {
    saveLocalForm(form);
    window.dispatchEvent(new Event('churvox-onboarding-save'));
  };

  const complete = async () => {
    saveLocalForm({ ...form, onboarding_completed: true });
    navigate('/dashboard');
  };

  const completedKeys = useMemo(() => {
    const done = new Set();
    if (form.business_name || user?.business_name || user?.company_name) done.add('business');
    if (user?.plan || user?.selected_plan || user?.plan_status || user?.subscription_status) done.add('plan');
    if (setupCounts.clients > 0) done.add('client');
    if (setupCounts.jobs > 0) done.add('job');
    if (setupCounts.workers > 0) done.add('worker');
    if (setupCounts.invoices > 0) done.add('invoice');
    done.add('ai');
    done.add('integrations');
    done.add('trust');
    return done;
  }, [form.business_name, setupCounts, user]);

  const percent = Math.round((completedKeys.size / launchSteps.length) * 100);
  const nextLaunchStep = launchSteps.find((item) => !completedKeys.has(item.key));
  const context = useMemo(() => ({ role: normalizedRole, form, setupCounts }), [normalizedRole, form, setupCounts]);

  return (
    <PremiumPage maxWidth={1180}>
      <PremiumHero
        title="Get Churvox ready for real work"
        subtitle="The signup path is simple: choose plan, finish business setup, add first client, create job, add worker, create invoice, then let Command Floor prepare the admin."
      />

      <PremiumCard title="Launch readiness checklist">
        <div className="mb-4 rounded-3xl border border-slate-700/60 bg-slate-950/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">Setup progress</p>
              <h2 className="text-3xl font-black text-white">{loadingCounts ? 'Checking…' : `${percent}% ready`}</h2>
              <p className="text-sm font-semibold text-slate-300">{completedKeys.size} of {launchSteps.length} launch steps complete.</p>
            </div>
            {nextLaunchStep ? <Link className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950" to={nextLaunchStep.href}>Next: {nextLaunchStep.title}</Link> : <Link className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950" to="/dashboard">Open Command Floor</Link>}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-lime-300" style={{ width: `${percent}%` }} /></div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {launchSteps.map((item) => {
            const done = completedKeys.has(item.key);
            return <Link key={item.key} to={item.href} className={`rounded-3xl border p-4 no-underline shadow-sm ${done ? 'border-lime-300/30 bg-lime-300/10' : 'border-slate-700 bg-slate-950/40'}`}>
              <p className={`text-xs font-black uppercase tracking-[0.18em] ${done ? 'text-lime-300' : 'text-cyan-300'}`}>{done ? 'Done' : 'Next'}</p>
              <h3 className="mt-2 text-xl font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-300">{item.why}</p>
            </Link>;
          })}
        </div>
      </PremiumCard>

      <PremiumCard title={`Guided setup form: ${STEPS[step]}`}>
        {step === 0 && <p className="text-sm text-slate-300">Use this guided form for better defaults, or jump straight into the checklist above.</p>}
        {step === 1 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="px-input" placeholder="Business name" value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} />
          <select className="px-input" value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}><option value="">Industry/trade</option><option>Lawn Care</option><option>Landscaping</option><option>Cleaning</option><option>Handyman</option><option>Painting</option><option>Plumbing</option><option>Electrical</option><option>Pest Control</option><option>Gardening</option><option>General services</option><option>Other</option></select>
          <input className="px-input" placeholder="Region/location" value={form.region} onChange={e=>setForm({...form,region:e.target.value})} />
          <input className="px-input" placeholder="Main service type" value={form.main_service_type} onChange={e=>setForm({...form,main_service_type:e.target.value})} />
        </div>}
        {step === 2 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-200">
          <select className="px-input" value={form.team_size} onChange={e=>setForm({...form,team_size:e.target.value})}><option value="1">1</option><option value="2-5">2-5</option><option value="6-15">6-15</option><option value="16+">16+</option></select>
          <label className="text-sm"><input type="checkbox" checked={form.uses_myob} onChange={e=>setForm({...form,uses_myob:e.target.checked})}/> Uses MYOB</label>
          <label className="text-sm"><input type="checkbox" checked={form.sms_later} onChange={e=>setForm({...form,sms_later:e.target.checked})}/> Wants SMS reminders later</label>
        </div>}
        {step === 3 && <PremiumAIDraftPanel title="AI Setup Guide" subtitle="Suggested templates, automations, invoicing, import flow and roles." surface="onboarding" context={context} defaultPrompt="Create a concise setup checklist with first-week actions. Include MYOB later steps if selected." quickActions={[{label:'Setup guide',prompt:'Create a concise onboarding setup guide.'},{label:'Automation ideas',prompt:'Suggest safe first automations only.'},{label:'Owner summary',prompt:'Summarise best first actions for the owner.'}]} />}
        {step === 4 && <p className="text-sm text-slate-300">All set. You can finish now and go to Command Floor.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <PremiumButton variant="secondary" onClick={save}>Save progress</PremiumButton>
          <PremiumButton variant="ghost" onClick={() => navigate('/dashboard')}>Skip for now</PremiumButton>
          {step > 0 ? <PremiumButton variant="secondary" onClick={() => setStep(step - 1)}>Back</PremiumButton> : null}
          {step < STEPS.length - 1 ? <PremiumButton onClick={() => setStep(step + 1)}>Next</PremiumButton> : <PremiumButton onClick={complete}>Finish</PremiumButton>}
        </div>
      </PremiumCard>
    </PremiumPage>
  );
}
