import React from "react";

const REVIEWS_KEY = "churvox:fresh-reviews:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "rev-1",
    customer: "Aroha Property Care",
    job: "Lawn service",
    rating: 5,
    status: "Ready to request",
    channel: "Google",
    owner: "Owner",
    note: "Good repeat customer. Photos complete. Ask for a review.",
    response: "Thanks for using Churvox. We’d really appreciate a quick review.",
  },
  {
    id: "rev-2",
    customer: "Lower Hutt Medical Centre",
    job: "Garden tidy",
    rating: 4,
    status: "Follow up",
    channel: "Email",
    owner: "Ana Williams",
    note: "Customer was happy but wants recurring price confirmed.",
    response: "Thanks for the feedback. We’ll confirm the regular tidy pricing.",
  },
  {
    id: "rev-3",
    customer: "Birchville Rentals",
    job: "Driveway clean",
    rating: 2,
    status: "Needs owner",
    channel: "Phone",
    owner: "Owner",
    note: "Access issue caused delay. Needs owner call before asking for review.",
    response: "Sorry for the delay. We’re checking the access issue and will follow up.",
  },
];

function readReviews() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(REVIEWS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveReviews(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "reviews" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendReviewToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `review-${item.id}-${Date.now()}`,
      group: "Reviews",
      title: "Customer feedback needs review",
      info: `${item.customer} · ${item.rating} stars · ${item.status}`,
      urgency: Number(item.rating || 0) <= 3 ? "Reputation risk" : item.status,
      found: `${item.customer} has feedback from ${item.job}.`,
      prepared: item.response,
      why: item.note,
      owner: "Approve response, call customer, ask for review, or open Messages.",
      area: "Reviews",
      page: "reviews",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "review-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshReviews({ onNavigate }) {
  const [items, setItems] = React.useState(readReviews);
  const [selectedId, setSelectedId] = React.useState(() => readReviews()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const ready = items.filter((item) => item.status === "Ready to request").length;
  const owner = items.filter((item) => item.status === "Needs owner").length;
  const low = items.filter((item) => Number(item.rating || 0) <= 3).length;
  const avg = items.length
    ? (items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length).toFixed(1)
    : "0.0";

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveReviews(next);
      return next;
    });
  }

  function addReview() {
    const next = {
      id: `rev-${Date.now()}`,
      customer: "New customer",
      job: "New job",
      rating: 5,
      status: "Ready to request",
      channel: "Google",
      owner: "Owner",
      note: "Add review or feedback note.",
      response: "Thanks for using Churvox. We’d appreciate your feedback.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveReviews(updated);
  }

  function resetReviews() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveReviews(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendReviewToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshReviewsPage">
      <div className="freshReviewsHero">
        <div>
          <span>Reviews / reputation</span>
          <h1>Protect the name before problems spread</h1>
          <p>Track good review requests, low feedback, complaints, replies and owner follow-up.</p>
        </div>

        <div className="freshReviewsStats">
          <div><b>{avg}</b><small>average</small></div>
          <div><b>{ready}</b><small>ask now</small></div>
          <div><b>{owner}</b><small>owner</small></div>
          <div><b>{low}</b><small>risk</small></div>
        </div>
      </div>

      <div className="freshReviewsLayout">
        <aside className="freshReviewsList">
          <header>
            <div>
              <b>Feedback queue</b>
              <span>Reviews + replies</span>
            </div>
            <button type="button" onClick={addReview}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.customer}</b>
              <span>{item.job}</span>
              <small>{item.rating} stars · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshReviewsReset" onClick={resetReviews}>
            Reset reviews
          </button>
        </aside>

        {selected && (
          <article className="freshReviewsDetail">
            <div className="freshReviewsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.job} · {selected.rating} stars</p>
              </div>

              <div className="freshReviewsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
                <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
              </div>
            </div>

            <div className="freshReviewsCards">
              <section>
                <span>Rating</span>
                <b>{selected.rating} / 5</b>
                <p>{Number(selected.rating || 0) <= 3 ? "Needs owner care before review request." : "Safe to ask for public review."}</p>
              </section>

              <section>
                <span>Channel</span>
                <b>{selected.channel}</b>
                <p>Where the request or response should happen.</p>
              </section>

              <section>
                <span>Owner</span>
                <b>{selected.owner}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshReviewsForm">
              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Rating</span>
                <select value={selected.rating} onChange={(event) => updateItem(selected.id, { rating: Number(event.target.value || 0) })}>
                  <option value={5}>5</option>
                  <option value={4}>4</option>
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready to request</option>
                  <option>Follow up</option>
                  <option>Needs owner</option>
                  <option>Responded</option>
                  <option>Closed</option>
                </select>
              </label>

              <label>
                <span>Channel</span>
                <select value={selected.channel} onChange={(event) => updateItem(selected.id, { channel: event.target.value })}>
                  <option>Google</option>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Portal</option>
                  <option>Manual</option>
                </select>
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label className="wide">
                <span>Response</span>
                <textarea value={selected.response} onChange={(event) => updateItem(selected.id, { response: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshReviewsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ready to request" })}>Ask for review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Responded" })}>Responded</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => onNavigate?.("followups")}>Open Follow-ups</button>
              <button type="button" onClick={() => onNavigate?.("photos")}>Open Photos</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
