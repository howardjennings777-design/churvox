import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumAIBox } from '@/components/premium';
import { useApi } from '@/hooks/useApi';
import useAiDraft from '@/hooks/useAiDraft';

export default function OnboardingPage(){
 const { post } = useApi();
 const { loading, draft, generate } = useAiDraft('onboarding');
 const [form,setForm]=useState({business_name:'',industry:'',region:'',team_size:'1',uses_myob:false,sms_later:false});
 const save=()=>post('/onboarding/save',form);
 const complete=()=>post('/onboarding/complete',{}).then(()=>window.location.href='/dashboard');
 return <Layout><PremiumPage><PremiumHero title='Welcome to Churvox' subtitle='Quick onboarding setup' /><PremiumCard title='Business setup'>
 <input className='px-input mb-2' placeholder='Business name' value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})}/>
 <input className='px-input mb-2' placeholder='Industry/trade' value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/>
 <input className='px-input mb-2' placeholder='Region/location' value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/>
 <div className='flex gap-2'><PremiumButton onClick={save} variant='secondary'>Save</PremiumButton><PremiumButton onClick={complete}>Complete</PremiumButton></div>
 </PremiumCard>
 <PremiumAIBox title='AI Setup Guide'>{<div><PremiumButton size='sm' onClick={()=>generate('Suggest onboarding setup steps',form)} disabled={loading}>Generate setup guide</PremiumButton>{draft?<div className='mt-2 whitespace-pre-wrap'>{draft}</div>:null}</div>}</PremiumAIBox>
 </PremiumPage></Layout>
}
