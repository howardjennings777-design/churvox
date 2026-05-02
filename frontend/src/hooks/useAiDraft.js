import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export default function useAiDraft(surface) {
  const { post } = useApi();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [llmAvailable, setLlmAvailable] = useState(true);

  const generate = useCallback(async (prompt, context = {}) => {
    setLoading(true);
    try {
      const res = await post('/ai/generate-draft', { surface, prompt, context });
      setDraft(res?.draft || '');
      setLlmAvailable(Boolean(res?.llm_available));
      return res;
    } finally {
      setLoading(false);
    }
  }, [post, surface]);

  return { loading, draft, llmAvailable, setDraft, generate };
}
