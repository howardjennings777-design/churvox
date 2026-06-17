import React from "react";
import { useApi } from "../hooks/useApi";

const ACTION_GROUPS = [
  { title: "Create", hint: "AI prepares real records", actions: [["add-job", "Add job", "16 Taita Drive $60 repeat next Friday"], ["add-client", "Add client", "add client with email and phone"], ["add-quote", "Add quote", "quote hedge trim $180 at 12 High Street"], ["add-invoice", "Add invoice", "draft invoice for hedge trim $120"]] },
  { title: "Work", hint: "AI checks live jobs", actions: [["find-record", "Find record", "find the client I worked for today"], ["move-job", "Move job", "move the lawn job to next week"], ["complete-job", "Complete job", "mark the completed job done"], ["update-price", "Update price", "change the matched job price to $70"]] },
  { title: "Money", hint: "Draft only", actions: [["invoice-job", "Invoice job", "invoice the completed job"], ["invoice-jobs", "Invoice jobs", "invoice completed jobs"], ["chase-invoices", "Chase invoices", "prepare follow ups for unpaid invoices"]] },
];

const pillButton = { border: 0, borderRadius: 999, minHeight: 38, padding: "0 13px", background: "#fff", color: "#9a3412", WebkitTextFillColor: "#9a3412", fontWeight: 1000, cursor: "pointer", boxShadow: "0 8px 22px rgba(154,52,18,.08)" };

function ActionGroups({ onPick }) {
  return <div style={{ display: "grid", gap: 10, marginTop: 12 }} aria-label="Tell Churvox examples">
    {ACTION_GROUPS.map((group) => <section key={group.title} style={{ border: "1px solid rgba(154,52,18,.16)", borderRadius: 18, background: "rgba(255,247,237,.72)", padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <b style={{ color: "#101827", WebkitTextFillColor: "#101827", fontWeight: 1000, fontSize: 13 }}>{group.title}</b>
        <span style={{ color: "#9a3412", WebkitTextFillColor: "#9a3412", fontWeight: 1000, fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em" }}>{group.hint}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {group.actions.map(([key, label, value]) => <button key={key} type="button" style={pillButton} onClick={() => onPick(value)}>{label}</button>)}
      </div>
    </section>)}
  </div>;
}

function itemDetails(item) {
  const details = item?.details && typeof item.details === "object" ? item.details : {};
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  if (entries.length) return entries;
  return [["What Churvox found", item?.match?.label || "AI checked live Churvox data"], ["What Churvox prepared", item?.summary || "Prepared work for Review"], ["Why it needs approval", "Owner approval is required before anything changes."]];
}

export default function FreshAiQuickCreateBrainV8({ onNavigate }) {
  const { post } = useApi();
  const [text, setText] = React.useState("");
  const [item, setItem] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const hasText = Boolean(text.trim());

  function setExample(value) {
    setText(value);
    setItem(null);
    setStatus(null);
  }

  async function prepareWithRealAi() {
    const instruction = text.trim();
    if (!instruction) {
      setStatus({ tone: "need", title: "Tell Churvox first", text: "Type what you want done, then Churvox AI will prepare the real Review item." });
      return;
    }
    setBusy(true);
    setItem(null);
    setStatus({ tone: "ok", title: "AI is working", text: "Churvox is checking live records and preparing the admin work." });
    const res = await post("/tell-churvox/prepare", { text: instruction }, { timeout: 60000 });
    setBusy(false);
    if (!res?.success) {
      setStatus({ tone: "need", title: "Real AI did not run", text: res?.error || "Backend AI is not ready. No fake preview was created." });
      return;
    }
    const nextItem = res?.data?.item || res?.item || res?.data;
    setItem(nextItem);
    setStatus({ tone: "ok", title: "Saved to Review", text: "Churvox AI prepared real backend Review work. Nothing changes until you approve it." });
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "backend-ai-review" } }));
  }

  return <section className="freshQuickAiPage freshQuickAiPage--clean">
    <div className="freshQuickAiHero freshQuickAiHero--clean">
      <div>
        <span>Tell Churvox</span>
        <h1>Say it once.</h1>
        <p>Type the job, customer, price, date or change. Churvox prepares it for Review — nothing changes until you approve.</p>
      </div>
      <div className="freshQuickAiStats freshQuickAiStats--clean">
        <button type="button" onClick={() => onNavigate?.("command")}><b>{item ? "Ready" : busy ? "Working" : "Review"}</b><small>Approval tray</small></button>
        <button type="button" onClick={() => onNavigate?.("jobs")}><b>Live</b><small>Checks records</small></button>
      </div>
    </div>

    <div className="freshQuickAiCommandGrid">
      <article className="freshQuickAiPanel freshQuickAiPanel--command">
        <header><span>Real AI instruction</span><h2>What do you want done?</h2><p>Example: “16 Taita Drive $60 repeat next Friday” or “invoice completed mowing jobs”.</p></header>
        <textarea value={text} onChange={(event) => { setText(event.target.value); setItem(null); setStatus(null); }} placeholder="Type naturally here…" autoFocus />
        <div className="freshQuickAiButtons freshQuickAiButtons--primary">
          <button type="button" onClick={prepareWithRealAi} disabled={busy || !hasText}>{busy ? "AI preparing…" : "Prepare for Review"}</button>
          <button type="button" onClick={() => { setText(""); setItem(null); setStatus(null); }}>Clear</button>
          <button type="button" onClick={() => onNavigate?.("command")}>Open Review</button>
        </div>
        {status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.title}</b><span>{status.text}</span></div> : null}
      </article>

      <aside className="freshQuickAiPanel freshQuickAiPanel--side">
        <header><span>What happens next</span><h2>{item?.title || "Safe by default"}</h2><p>Churvox prepares work only. You approve the final action in Review.</p></header>

        {item ? <>
          <div className="freshQuickAiResult freshQuickAiResult--stacked">
            {itemDetails(item).map(([label, value]) => <section key={label}><b>{label}</b><p>{String(value)}</p></section>)}
          </div>
          <div className="freshQuickAiButtons"><button type="button" onClick={() => onNavigate?.("command")}>Review prepared work</button><button type="button" onClick={() => setItem(null)}>Clear preview</button></div>
        </> : <div className="freshQuickAiSteps">
          <section><b>1</b><span>Type the job or admin request</span></section>
          <section><b>2</b><span>AI checks live Churvox records</span></section>
          <section><b>3</b><span>Prepared work lands in Review</span></section>
          <section><b>4</b><span>You approve before anything changes</span></section>
        </div>}
      </aside>
    </div>

    <ActionGroups onPick={setExample} />
  </section>;
}
