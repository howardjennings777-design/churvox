import { useMemo, useState } from 'react';

export default function AIActionDetailDrawer({ open, action, onClose, onApprove, onReject, onSaveEdits, busy }) {
  const [reason, setReason] = useState('');
  const [edited, setEdited] = useState({});
  const payload = useMemo(() => ({ ...(action?.suggested_payload || {}), ...edited }), [action, edited]);
  if (!open || !action) return null;
  return <div className='op-ai-drawer-backdrop'><aside className='op-ai-drawer'>
    <h3>{action.title}</h3><p>{action.status} · Priority {action.priority_score} · Confidence {action.confidence} · Risk {action.risk}</p>
    <p>{action.reason}</p>
    <ul className='op-ai-reason-list'>{(action.reason_points||[]).map((x,i)=><li key={i}>{x}</li>)}</ul>
    <pre className='op-ai-data-used'>{JSON.stringify(action.data_used||[],null,2)}</pre>
    <pre className='op-ai-exact-changes'>{action.exact_changes}</pre>
    <pre>{JSON.stringify(payload,null,2)}</pre>
    {action.owner_can_edit ? <div className='op-ai-edit-grid'>{Object.keys(action.suggested_payload||{}).map((k)=><label key={k}>{k}<input defaultValue={String(action.suggested_payload[k]??'')} onChange={(e)=>setEdited((s)=>({...s,[k]:e.target.value}))}/></label>)}</div> : null}
    <p>{action.guardrail || action.policy?.guardrail}</p>
    <textarea placeholder='Reject reason' value={reason} onChange={(e)=>setReason(e.target.value)} />
    <div><button onClick={()=>onSaveEdits?.(action, edited)} disabled={busy}>Save edits</button><button onClick={()=>onApprove?.(action, edited)} disabled={busy}>Approve</button><button onClick={()=>onReject?.(action, reason)} disabled={busy}>Reject</button><button onClick={onClose}>Close</button></div>
  </aside></div>;
}
