import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ShieldCheck, Copy, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import useAiDraft from '@/hooks/useAiDraft';
import PremiumButton from './PremiumButton';

const cleanDraft = (text) => String(text || '')
  .replace(/^\s*---+\s*$/gm, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export default function PremiumAIDraftPanel({
  title = 'AI Draft Assistant',
  subtitle,
  surface = 'smart_hub',
  defaultPrompt = 'Give a concise response unless I ask for more detail.',
  showPrompt = false,
  context = {},
  quickActions = [],
  loadingLabel = 'AI is preparing drafts…',
  emptyLabel = 'No draft needed right now.',
}) {
  const { loading, draft, llmAvailable, setDraft, generate } = useAiDraft(surface);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [draftsByLabel, setDraftsByLabel] = useState({});
  const [activeLabel, setActiveLabel] = useState(quickActions?.[0]?.label || 'Draft');
  const [error, setError] = useState('');
  const [lastPreparedAt, setLastPreparedAt] = useState('');
  const autoKeyRef = useRef('');

  const cleanedDraft = useMemo(() => cleanDraft(draft), [draft]);
  const draftsReady = useMemo(() => Object.values(draftsByLabel).filter(Boolean).length, [draftsByLabel]);

  const runGenerate = async (nextPrompt) => {
    setError('');
    try {
      const result = await generate(nextPrompt || prompt || defaultPrompt, context || {});
      setLastPreparedAt(new Date().toISOString());
      return cleanDraft(result?.draft || '');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Could not prepare drafts right now.';
      setError(msg);
      toast.error(msg);
      return '';
    }
  };

  const prepareDrafts = async () => {
    const actions = Array.isArray(quickActions) ? quickActions : [];
    if (!actions.length) {
      const single = await runGenerate();
      if (!single) return;
      setDraft(single);
      return;
    }
    const mapped = {};
    for (const item of actions) {
      const content = await runGenerate(item.prompt || defaultPrompt);
      if (content) mapped[item.label] = content;
    }
    setDraftsByLabel(mapped);
    const firstLabel = actions.find((a) => mapped[a.label])?.label || actions[0]?.label;
    if (firstLabel) {
      setActiveLabel(firstLabel);
      setDraft(mapped[firstLabel] || '');
    }
  };

  useEffect(() => {
    const nextKey = JSON.stringify({
      surface,
      context,
      actionPrompts: quickActions?.map?.((q) => q.prompt),
    });
    if (!context || autoKeyRef.current === nextKey) return;
    autoKeyRef.current = nextKey;
    prepareDrafts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, context, quickActions]);

  useEffect(() => {
    if (activeLabel && draftsByLabel[activeLabel]) setDraft(draftsByLabel[activeLabel]);
  }, [activeLabel, draftsByLabel, setDraft]);

  return (
    <div className="rounded-2xl border border-[#d8e3f3] bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-[#ede9fe] text-[#7c3aed] inline-flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-[#0d1b34]">{title}</h3>
          {subtitle ? <p className="text-[12.5px] text-[#5b6c87] mt-0.5">{subtitle}</p> : null}
          <div className="mt-2 text-[11.5px] text-[#5b6c87]">AI checked: <span className="font-semibold text-[#1a2c4d]">ON</span> · Last prepared: <span className="font-semibold text-[#1a2c4d]">{lastPreparedAt ? 'Just now' : '—'}</span> · AI prepared: <span className="font-semibold text-[#1a2c4d]">{draftsReady}</span></div>
        </div>
      </div>

      {showPrompt ? <textarea className="px-input min-h-[88px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} /> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {quickActions.map((q) => (
          <PremiumButton key={q.label} size="sm" variant={activeLabel === q.label ? 'primary' : 'secondary'} onClick={() => setActiveLabel(q.label)}>{q.label}</PremiumButton>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <PremiumButton size="sm" variant="secondary" iconLeft={<RefreshCw className="h-4 w-4" />} disabled={loading} onClick={() => prepareDrafts()}>{loading ? 'Refreshing…' : 'Refresh drafts'}</PremiumButton>
      </div>
      {!llmAvailable ? <p className="mt-2 text-[11.5px] text-[#b45309]">AI checked local fallback because live AI is unavailable.</p> : null}
      {error ? <p className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-[13px] text-[#5b6c87]">{loadingLabel}</p> : null}
      {!loading && cleanedDraft ? (
        <div className="mt-3 rounded-xl border border-[#d8e3f3] bg-[#f7faff] p-3 text-[13px] text-[#1a2c4d] whitespace-pre-wrap leading-relaxed">
          {cleanedDraft}
        </div>
      ) : null}
      {!loading && !cleanedDraft && !error ? <p className="mt-3 text-[13px] text-[#5b6c87]">{emptyLabel}</p> : null}
      {cleanedDraft ? <div className="mt-2 flex flex-wrap gap-2"><PremiumButton size="sm" variant="secondary" iconLeft={<Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(cleanedDraft)}>Copy draft</PremiumButton><PremiumButton size="sm" variant="ghost" iconLeft={<Trash2 className="h-4 w-4" />} onClick={() => setDraft('')}>Clear</PremiumButton></div> : null}
      <p className="text-[11.5px] text-[#5b6c87] mt-3 inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />AI prepared this draft for approval. It never auto-charges, edits payroll, changes pricing, or syncs MYOB without approval.</p>
    </div>
  );
}
