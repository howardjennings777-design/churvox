import React from "react";
import { useApi } from "../hooks/useApi";

function itemDetails(item) {
  const details = item?.details && typeof item.details === "object" ? item.details : {};
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  if (entries.length) return entries;
  return [
    ["What Churvox found", item?.match?.label || "AI checked live Churvox data"],
    ["What Churvox prepared", item?.summary || "Prepared work for Review"],
    ["Why it needs approval", "Owner approval is required before anything changes."],
  ];
}

export default function FreshAiQuickCreateBrainV8({ onNavigate }) {
  const { post } = useApi();
  const textareaRef = React.useRef(null);
  const [text, setText] = React.useState("");
  const [item, setItem] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const hasText = Boolean(text.trim());

  function clearAll() {
    setText("");
    setItem(null);
    setStatus(null);
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }

  async function prepareForReview() {
    const instruction = text.trim();

    if (!instruction) {
      setStatus({
        tone: "need",
        title: "Tell Churvox first",
        text: "Type what you want done. Churvox will prepare it for Review.",
      });
      return;
    }

    setBusy(true);
    setItem(null);
    setStatus({
      tone: "ok",
      title: "Preparing",
      text: "Churvox is checking live records and preparing the Review item.",
    });

    const res = await post("/tell-churvox/prepare", { text: instruction }, { timeout: 60000 });
    setBusy(false);

    if (!res?.success) {
      setStatus({
        tone: "need",
        title: "Could not prepare",
        text: res?.error || "Tell Churvox could not prepare this yet. Nothing was changed.",
      });
      return;
    }

    const nextItem = res?.data?.item || res?.item || res?.data;
    const nextId = nextItem?.id || nextItem?._id || "";

    setItem(nextItem);
    setText("");
    setStatus({
      tone: "ok",
      title: "Saved to Review",
      text: "Churvox prepared backend Review work. Opening Review now.",
    });

    try {
      if (nextId) window.localStorage.setItem("churvox:last-ai-review-id:v1", nextId);
    } catch {}

    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "backend-ai-review", id: nextId } }));
    window.setTimeout(() => onNavigate?.("command"), 450);
  }

  return (
    <section className="freshQuickAiPage freshQuickAiPage--clean freshQuickAiPage--noPills">
      <div className="freshQuickAiHero freshQuickAiHero--clean">
        <div>
          <span>Tell Churvox</span>
          <h1>Say it once.</h1>
          <p>Type the job, customer, price, date or change. Churvox prepares it for Review — nothing changes until you approve.</p>
        </div>
        <div className="freshQuickAiStats freshQuickAiStats--clean">
          <button type="button" onClick={() => onNavigate?.("command")}>
            <b>{item ? "Ready" : busy ? "Working" : "Review"}</b>
            <small>Approval tray</small>
          </button>
          <button type="button" onClick={() => onNavigate?.("jobs")}>
            <b>Live</b>
            <small>Checks records</small>
          </button>
        </div>
      </div>

      <div className="freshQuickAiCommandGrid">
        <article className="freshQuickAiPanel freshQuickAiPanel--command freshQuickAiPanel--soloCommand">
          <header>
            <span>Real AI instruction</span>
            <h2>What do you want done?</h2>
            <p>Write it like you would say it to a real admin person.</p>
          </header>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setItem(null);
              if (status?.title !== "Preparing") setStatus(null);
            }}
            placeholder={"Examples:\nCreate a mowing job at 16 Taita Drive next Friday for $60\nAdd Sarah as a client with phone 021000000\nPrepare invoices for completed jobs\nMove tomorrow's job to next week"}
            autoFocus
          />

          <div className="freshQuickAiButtons freshQuickAiButtons--primary">
            <button type="button" onClick={prepareForReview} disabled={busy || !hasText}>
              {busy ? "Preparing…" : "Prepare for Review"}
            </button>
            <button type="button" onClick={clearAll}>Clear</button>
            <button type="button" onClick={() => onNavigate?.("command")}>Open Review</button>
          </div>

          {status ? (
            <div className={`freshQuickAiStatus ${status.tone}`}>
              <b>{status.title}</b>
              <span>{status.text}</span>
            </div>
          ) : null}
        </article>

        <aside className="freshQuickAiPanel freshQuickAiPanel--side">
          <header>
            <span>What happens next</span>
            <h2>{item?.title || "Safe by default"}</h2>
            <p>Tell Churvox prepares work only. You approve the final action in Review.</p>
          </header>

          {item ? (
            <>
              <div className="freshQuickAiResult freshQuickAiResult--stacked">
                {itemDetails(item).map(([label, value]) => (
                  <section key={label}>
                    <b>{label}</b>
                    <p>{String(value)}</p>
                  </section>
                ))}
              </div>
              <div className="freshQuickAiButtons">
                <button type="button" onClick={() => onNavigate?.("command")}>Review prepared work</button>
                <button type="button" onClick={() => setItem(null)}>Clear preview</button>
              </div>
            </>
          ) : (
            <div className="freshQuickAiSteps">
              <section><b>1</b><span>Type what you want done</span></section>
              <section><b>2</b><span>Churvox checks live records</span></section>
              <section><b>3</b><span>Prepared work lands in Review</span></section>
              <section><b>4</b><span>You approve before anything changes</span></section>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
