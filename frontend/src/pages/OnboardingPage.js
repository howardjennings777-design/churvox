import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumAIDraftPanel } from '@/components/premium';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';

const STEPS = ['Welcome', 'Business setup', 'Team/workflow', 'AI recommendations', 'Finish'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ business_name: '', industry: '', region: '', main_service_type: '', team_size: '1', uses_myob: false, sms_later: false });

  useEffect(() => {
    (async () => {
      const status = await get('/onboarding/status');
      if (!status?.success) return;
      const d = status.data || {};
      if (d.onboarding_completed || normalizedRole === 'worker') navigate('/dashboard');
      if (d.form && typeof d.form === 'object') setForm((f) => ({ ...f, ...d.form }));
    })();
  }, [get, navigate, normalizedRole]);

  const save = async () => { await post('/onboarding/save', { ...form, step }); };
  const complete = async () => { await post('/onboarding/complete', { ...form }); navigate('/dashboard'); };

  const context = useMemo(() => ({ role: normalizedRole, form }), [normalizedRole, form]);

  return <Layout><PremiumPage>
    <PremiumHero title="Welcome to Churvox" subtitle="Set up your business in a few guided steps." />
    <PremiumCard title={`Step ${step + 1}: ${STEPS[step]}`}>
      {step === 0 && <p className='text-sm text-[#5b6c87]'>You can skip this and start now, or finish setup for better defaults and AI guidance.</p>}
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
      {step === 4 && <p className='text-sm text-[#5b6c87]'>All set. You can finish now and go to Smart Hub.</p>}
      <div className='mt-3 flex flex-wrap gap-2'>
        <PremiumButton variant='secondary' onClick={save}>Save progress</PremiumButton>
        <PremiumButton variant='ghost' onClick={() => navigate('/dashboard')}>Skip for now</PremiumButton>
        {step > 0 ? <PremiumButton variant='secondary' onClick={() => setStep(step - 1)}>Back</PremiumButton> : null}
        {step < STEPS.length - 1 ? <PremiumButton onClick={() => setStep(step + 1)}>Next</PremiumButton> : <PremiumButton onClick={complete}>Finish</PremiumButton>}
      </div>
    </PremiumCard>
  </PremiumPage></Layout>;
}
