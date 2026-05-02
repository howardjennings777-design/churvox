import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export default function useAiDraft(surface) {
  const { post } = useApi();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [llmAvailable, setLlmAvailable] = useState(true);
  const [suggestedActions, setSuggestedActions] = useState([]);

  const generate = useCallback(async (prompt, context = {}) => {
    setLoading(true);
    try {
      const res = await post('/ai/generate-draft', { surface, prompt, context });
      const data = res?.data || {};
      setDraft(data?.draft || '');
      setLlmAvailable(Boolean(data?.llm_available));
      setSuggestedActions(Array.isArray(data?.suggested_actions) ? data.suggested_actions : []);
      return data;
    } finally {
      setLoading(false);
    }
  }, [post, surface]);

  return { loading, draft, llmAvailable, suggestedActions, setDraft, generate };
}
