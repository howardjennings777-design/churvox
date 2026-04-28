import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AIBusinessBriefCard from "../components/ai/AIBusinessBriefCard";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { AppShell, PageHeader, SectionCard } from "../components/premium/PremiumUI";
import { Bot, Copy, FileText, RefreshCw, Send, Sparkles } from "lucide-react";

const DRAFT_TYPES = [
  ["invoice_reminder", "Invoice reminder"],
  ["quote_follow_up", "Quote follow-up"],
  ["job_reminder", "Job reminder"],
  ["thank_you", "Thank-you after job"],
  ["payment_follow_up", "Payment follow-up"],
];

export default function AIAssistantPage() {
  const { get, post } = useApi();
  const [question, setQuestion] = useState("What needs my attention today?");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [draftType, setDraftType] = useState("invoice_reminder");
  const [draftContext, setDraftContext] = useState("");
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    get("/ai/automation-suggestions").then((res) => {
      if (res.success) setSuggestions(Array.isArray(res.data?.suggestions) ? res.data.suggestions : []);
    });
  }, [get]);

  const askAI = async (e) => {
    e?.preventDefault?.();
    if (!question.trim()) return;
    setAsking(true);
    try {
      const res = await post("/ai/ask", { question });
      setAnswer(res.success ? (res.data?.answer || "No answer returned.") : (res.error || "Could not ask AI Assistant."));
    } finally {
      setAsking(false);
    }
  };

  const makeDraft = async () => {
    setDrafting(true);
    try {
      const res = await post("/ai/message-draft", {
        message_type: draftType,
        tone: "professional, friendly, short, trade/service business",
        context: { notes: draftContext },
      });
      setDraft(res.success ? (res.data?.draft || "") : (res.error || "Could not create draft."));
    } finally {
      setDrafting(false);
    }
  };

  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draft); } catch (err) { console.warn("Copy failed", err); }
  };

  return (
    <Layout>
      <AppShell data-testid="ai-assistant-page">
        <PageHeader
          title="AI Assistant"
          description="Your business command centre for urgent actions, follow-ups, job summaries, invoice wording and automation ideas."
          action={<Button onClick={askAI} className="bg-blue-600 hover:bg-blue-700"><Sparkles className="mr-2 h-4 w-4" />Ask now</Button>}
        />

        <AIBusinessBriefCard />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionCard title="Ask your business" action={<Bot className="h-5 w-5 text-blue-600" />} className="xl:col-span-2">
            <form onSubmit={askAI} className="space-y-3">
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Ask: Who owes me money? What jobs are unfinished? What quotes need chasing?" />
              <div className="flex flex-wrap gap-2">
                {["What needs my attention today?", "Who owes me money?", "Which jobs are unfinished?", "What quotes need chasing?"].map((sample) => (
                  <button key={sample} type="button" onClick={() => setQuestion(sample)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50">{sample}</button>
                ))}
              </div>
              <Button type="submit" disabled={asking} className="bg-blue-600 hover:bg-blue-700">{asking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Ask AI Assistant</Button>
            </form>
            {answer && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">Answer</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{answer}</p></div>}
          </SectionCard>

          <SectionCard title="Automation ideas">
            <div className="space-y-2">
              {suggestions.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-sm font-black text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p></div>)}
              {!suggestions.length && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No automation suggestions yet.</p>}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Message drafting">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">Draft type</label>
              <select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                {DRAFT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <label className="block text-sm font-bold text-slate-800">Helpful context</label>
              <textarea value={draftContext} onChange={(e) => setDraftContext(e.target.value)} rows={7} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Example: Sarah, invoice 7 days overdue, lawn mowing and green waste removal." />
              <Button type="button" onClick={makeDraft} disabled={drafting} className="w-full bg-blue-600 hover:bg-blue-700">{drafting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Create editable draft</Button>
            </div>
            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Editable draft</p>{draft && <Button type="button" variant="outline" onClick={copyDraft}><Copy className="mr-2 h-4 w-4" />Copy</Button>}</div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={13} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Your AI draft will appear here. Nothing is sent automatically." />
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Approval-first: AI only drafts. It does not send messages, change invoices, approve payroll, or alter pricing.</p>
            </div>
          </div>
        </SectionCard>
      </AppShell>
    </Layout>
  );
}
