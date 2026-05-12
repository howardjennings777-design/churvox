import { apiFetch } from "../api";
export const runAiOperatorPlan=()=>apiFetch('/ai/operator/plan',{method:'POST'});
export const getAiActions=(status)=>apiFetch(`/ai/operator/actions${status?`?status=${encodeURIComponent(status)}`:''}`);
export const getAiAction=(actionId)=>apiFetch(`/ai/operator/actions/${actionId}`);
export const approveAiAction=(actionId,editedPayload)=>apiFetch(`/ai/operator/actions/${actionId}/approve`,{method:'POST',body:{edited_payload:editedPayload}});
export const rejectAiAction=(actionId,reason)=>apiFetch(`/ai/operator/actions/${actionId}/reject`,{method:'POST',body:{reason}});
export const editAiAction=(actionId,editedPayload)=>apiFetch(`/ai/operator/actions/${actionId}/edit`,{method:'POST',body:{edited_payload:editedPayload}});
export const getAiActivity=()=>apiFetch('/ai/operator/activity');
export const getAiPolicy=()=>apiFetch('/ai/operator/policy');
export const getAiDataQuality=()=>apiFetch('/ai/operator/data-quality');
export const getAiAudit=()=>apiFetch('/ai/operator/audit');
export const updateAiMemory=()=>apiFetch('/ai/operator/learn',{method:'POST'});
export const getAiMemory=()=>apiFetch('/ai/operator/memory');
export const prepareDailyBriefing=()=>apiFetch('/ai/operator/daily-briefing',{method:'POST'});
export const getLatestBriefing=()=>apiFetch('/ai/operator/briefing/latest');
export const askBusiness=(question)=>apiFetch('/ai/operator/ask',{method:'POST',body:{question}});
export const classifyAiAction=(action_type,payload={})=>apiFetch('/ai/operator/classify-action',{method:'POST',body:{action_type,...payload}});
export async function loadAiIntelligenceSnapshot(){const [briefingRes,qualityRes,auditRes,memoryRes,policyRes,actionsRes,activityRes]=await Promise.all([getLatestBriefing().catch(()=>null),getAiDataQuality().catch(()=>null),getAiAudit().catch(()=>null),getAiMemory().catch(()=>null),getAiPolicy().catch(()=>null),getAiActions().catch(()=>null),getAiActivity().catch(()=>null)]);return {briefing:briefingRes?.briefing||null,quality:qualityRes?.quality||qualityRes?.report||null,dataQualityActions:qualityRes?.actions||qualityRes?.dataQualityActions||[],audit:auditRes?.audit||auditRes?.rows||[],memory:memoryRes?.memory||null,policy:policyRes?.policy||null,actions:actionsRes?.actions||actionsRes?.items||actionsRes?.rows||[],activity:activityRes?.activity||[]};}
