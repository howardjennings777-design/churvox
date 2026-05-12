import { useEffect, useState } from "react";
import ActionCard from "../components/ActionCard";
import EmptyState from "../components/EmptyState";
import AIActionDetailDrawer from "../components/ai/AIActionDetailDrawer";
import AIActivityTimeline from "../components/ai/AIActivityTimeline";
import { runAiOperatorPlan,getAiActions,approveAiAction,rejectAiAction,editAiAction,getAiActivity } from "../ai/aiIntelligenceApi";

export default function AIWorkQueue(){
  const [actions,setActions]=useState([]); const [activity,setActivity]=useState([]); const [selected,setSelected]=useState(null); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState('');
  const load=async()=>{const a=await getAiActions(); setActions(a?.actions||a?.items||[]); const act=await getAiActivity(); setActivity(act?.activity||[])};
  useEffect(()=>{load().catch(()=>{});},[]);
  const scan=async()=>{setBusy(true);setNotice('');try{const r=await runAiOperatorPlan();setNotice(`AI prepared ${(r?.actions||[]).length} actions.`);await load();}catch(e){setNotice(e.message)}finally{setBusy(false)}};
  return <main className='op-workspace'><section className='op-workspace-head'><h1>Approve the work AI prepared for you.</h1><button onClick={scan} disabled={busy}>Scan business now</button></section>{notice?<section className='op-notice'>{notice}</section>:null}
    <section className='op-queue-list'>{!actions.length?<EmptyState title='No AI work waiting'/>:actions.map((a)=><ActionCard key={a.id||a._id} action={a} onReview={()=>setSelected(a)} onApprove={async()=>{try{await approveAiAction(a.id||a._id);await load();}catch(e){setNotice(e.message)}}} />)}</section>
    <AIActivityTimeline items={activity}/>
    <AIActionDetailDrawer open={!!selected} action={selected} onClose={()=>setSelected(null)} busy={busy}
      onSaveEdits={async(a,edited)=>{try{await editAiAction(a.id||a._id,edited);setNotice('Edits saved');await load();}catch(e){setNotice(e.message)}}}
      onApprove={async(a,edited)=>{try{await approveAiAction(a.id||a._id,edited);setSelected(null);await load();}catch(e){setNotice(e.message)}}}
      onReject={async(a,reason)=>{try{await rejectAiAction(a.id||a._id,reason);setSelected(null);await load();}catch(e){setNotice(e.message)}}}/>
  </main>
}
