import React from "react";

const PHOTOS_KEY = "churvox:fresh-photos:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "photo-1",
    job: "Lawn service",
    client: "Aroha Property Care",
    status: "Needs after photo",
    before: true,
    after: false,
    access: true,
    notes: "Before photo and side gate access captured. Waiting for after photo.",
    risk: "Do not close job until after photo is added.",
  },
  {
    id: "photo-2",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    status: "Ready to approve",
    before: true,
    after: true,
    access: false,
    notes: "Before and after photos captured. No access photo needed.",
    risk: "Owner can approve proof and close job.",
  },
  {
    id: "photo-3",
    job: "Driveway clean",
    client: "Birchville Rentals",
    status: "Missing proof",
    before: false,
    after: false,
    access: false,
    notes: "No photos captured yet. Job is blocked until tenant access is confirmed.",
    risk: "Proof missing and access not confirmed.",
  },
];

function readPhotos() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(PHOTOS_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function savePhotos(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PHOTOS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "photos" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendPhotoIssue(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const issue = {
      id: `photo-proof-${item.id}-${Date.now()}`,
      group: "Photos",
      title: "Job proof needs review",
      info: `${item.client} · ${item.job}`,
      urgency: item.after ? "Ready to approve" : "Photo missing",
      found: `${item.job} has proof status: ${item.status}.`,
      prepared: "Churvox prepared a proof review slip for the owner.",
      why: item.risk,
      owner: "Check before/after proof, approve the job, or send it back to the worker.",
      area: "Photos",
      page: "photos",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([issue, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "photo-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshPhotos({ onNavigate }) {
  const [items, setItems] = React.useState(readPhotos);
  const [selectedId, setSelectedId] = React.useState(() => readPhotos()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const completeCount = items.filter((item) => item.before && item.after).length;
  const missingCount = items.filter((item) => !item.before || !item.after).length;
  const readyCount = items.filter((item) => item.status === "Ready to approve").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;

        const merged = { ...item, ...patch };
        if (merged.before && merged.after) merged.status = "Ready to approve";
        if (!merged.before && !merged.after) merged.status = "Missing proof";
        if (merged.before && !merged.after) merged.status = "Needs after photo";

        return merged;
      });

      savePhotos(next);
      return next;
    });
  }

  function toggleFlag(flag) {
    if (!selected) return;
    updateItem(selected.id, { [flag]: !selected[flag] });
  }

  function approveProof() {
    if (!selected) return;
    updateItem(selected.id, { status: "Approved proof" });
  }

  function resetPhotos() {
    savePhotos(defaults);
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  function sendToCommand() {
    if (!selected) return;
    sendPhotoIssue(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshPhotosPage">
      <div className="freshPhotosHero">
        <div>
          <span>Job proof</span>
          <h1>Photos and completion evidence</h1>
          <p>Keep customer proof tidy before the job is closed, invoiced or followed up.</p>
        </div>

        <div className="freshPhotosStats">
          <div><b>{items.length}</b><small>jobs checked</small></div>
          <div><b>{completeCount}</b><small>photo complete</small></div>
          <div><b>{missingCount}</b><small>missing proof</small></div>
          <div><b>{readyCount}</b><small>ready</small></div>
        </div>
      </div>

      <div className="freshPhotosLayout">
        <aside className="freshPhotosList">
          <header>
            <div>
              <b>Proof queue</b>
              <span>Before / after / access</span>
            </div>
            <button type="button" onClick={resetPhotos}>Reset</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.job}</b>
              <span>{item.client}</span>
              <small>{item.status}</small>
            </button>
          ))}
        </aside>

        {selected && (
          <article className="freshPhotosDetail">
            <div className="freshPhotosHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.job}</h2>
                <p>{selected.client}</p>
              </div>

              <div className="freshPhotosHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("worker")}>Open Worker</button>
              </div>
            </div>

            <div className="freshPhotoProofGrid">
              <button
                type="button"
                className={selected.before ? "done" : ""}
                onClick={() => toggleFlag("before")}
              >
                <i>{selected.before ? "✓" : "＋"}</i>
                <b>Before photo</b>
                <span>{selected.before ? "Captured" : "Missing"}</span>
              </button>

              <button
                type="button"
                className={selected.after ? "done" : ""}
                onClick={() => toggleFlag("after")}
              >
                <i>{selected.after ? "✓" : "＋"}</i>
                <b>After photo</b>
                <span>{selected.after ? "Captured" : "Missing"}</span>
              </button>

              <button
                type="button"
                className={selected.access ? "done" : ""}
                onClick={() => toggleFlag("access")}
              >
                <i>{selected.access ? "✓" : "＋"}</i>
                <b>Access photo</b>
                <span>{selected.access ? "Captured" : "Optional / missing"}</span>
              </button>
            </div>

            <div className="freshPhotosNotes">
              <div>
                <b>Owner note</b>
                <p>{selected.notes}</p>
              </div>

              <div>
                <b>Why it matters</b>
                <p>{selected.risk}</p>
              </div>
            </div>

            <div className="freshPhotosActions">
              <button type="button" onClick={approveProof}>Approve proof</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
