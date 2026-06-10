import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const reviewJobs = [
  {
    id: "rev-1",
    client: "Belmont Customer",
    job: "Lawn reset",
    score: "Good",
    urgency: "Medium",
    found: "Job completed with photos and no complaint.",
    prepared: "Review request ready after completion message.",
    avoid: false,
    message: "Thanks again for choosing us. If you’re happy with the work, a quick review would really help our small business.",
    page: "reviews",
  },
  {
    id: "rev-2",
    client: "Naenae Property",
    job: "Handyman repair",
    score: "Wait",
    urgency: "Low",
    found: "Customer asked about materials, so review request should wait.",
    prepared: "Explain invoice first. Ask for review only after customer is happy.",
    avoid: true,
    message: "Hold review request until materials question is resolved.",
    page: "reworkresolver",
  },
  {
    id: "rev-3",
    client: "Mere Road Client",
    job: "Regular mow",
    score: "Good",
    urgency: "Medium",
    found: "Customer has had 3 clean completed visits with no issues.",
    prepared: "Soft review request ready.",
    avoid: false,
    message: "Thanks for using us again. If you’re happy with the regular service, a quick review would mean a lot.",
    page: "customermemory",
  },
];

function sendReviewToCommand(item, message, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `review-booster-${item.id}-${Date.now()}`,
      group: "AI Review Booster",
      title: item.avoid ? "Do not ask for review yet" : `Review request: ${item.client}`,
      info: `${item.job} · ${item.score}`,
      urgency: item.urgency,
      found: item.found,
      prepared: message,
      why: item.avoid ? "Churvox should avoid asking unhappy or unsure customers for reviews." : "Happy customers should become reputation while the job is fresh.",
      owner: "Approve message, wait, open reviews, or ignore.",
      area: "Review Booster",
      page: "reviewbooster",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 140)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "review-booster" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshReviewBooster({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(reviewJobs[0].id);
  const selected = reviewJobs.find((item) => item.id === selectedId) || reviewJobs[0];
  const [message, setMessage] = React.useState(selected.message);
  const ready = reviewJobs.filter((item) => !item.avoid).length;

  React.useEffect(() => {
    setMessage(selected.message);
  }, [selected.id]);

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Review Booster</span>
          <h1>Ask happy customers for reviews, not annoyed ones</h1>
          <p>Churvox checks job status, complaints, photos and customer history before preparing review requests.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{reviewJobs.length}</b><small>jobs checked</small></div>
          <div><b>{ready}</b><small>ready to ask</small></div>
          <div><b>{selected.score}</b><small>selected</small></div>
          <div><b>Safe</b><small>review timing</small></div>
        </div>
      </div>

      <div className="freshOwnerAiSplit">
        <aside className="freshOwnerAiList">
          <header>
            <b>Review opportunities</b>
            <span>{ready} ready</span>
          </header>

          {reviewJobs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.client}</b>
              <span>{item.job}</span>
              <small>{item.avoid ? "Wait" : "Ready"} · {item.found}</small>
            </button>
          ))}
        </aside>

        <article className="freshOwnerAiDetail">
          <header>
            <span>{selected.avoid ? "Wait" : "Ready"}</span>
            <h2>{selected.client}</h2>
            <p>{selected.job}</p>
          </header>

          <div className="freshOwnerAiMiniGrid">
            <section><b>AI found</b><p>{selected.found}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
            <section><b>Timing</b><p>{selected.avoid ? "Do not ask yet" : "Safe to ask now"}</p></section>
          </div>

          <label className="freshOwnerAiEditor">
            <span>Editable review message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>

          <div className="freshOwnerAiButtons">
            <button type="button" onClick={() => sendReviewToCommand(selected, message, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open area</button>
            <button type="button" onClick={() => onNavigate?.("reviews")}>Open Reviews</button>
          </div>
        </article>
      </div>
    </section>
  );
}
