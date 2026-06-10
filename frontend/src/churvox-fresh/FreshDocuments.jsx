import React from "react";

const DOCS_KEY = "churvox:fresh-documents:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "doc-1",
    title: "Signed lawn quote",
    type: "Quote",
    client: "Aroha Property Care",
    job: "Lawn service",
    status: "Uploaded",
    owner: "Owner",
    date: "Today",
    note: "Signed quote attached to customer record.",
  },
  {
    id: "doc-2",
    title: "Fuel receipt",
    type: "Receipt",
    client: "Internal",
    job: "Route day",
    status: "Missing",
    owner: "Matiu Rangi",
    date: "Today",
    note: "Worker still needs to upload receipt.",
  },
  {
    id: "doc-3",
    title: "Access instructions",
    type: "Job file",
    client: "Birchville Rentals",
    job: "Driveway clean",
    status: "Needs review",
    owner: "Owner",
    date: "Tomorrow",
    note: "Tenant access details must be confirmed before dispatch.",
  },
];

function readDocs() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(DOCS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveDocs(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DOCS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "documents" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendDocToCommand(doc) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `document-${doc.id}-${Date.now()}`,
      group: "Documents",
      title: "Document needs owner review",
      info: `${doc.title} · ${doc.status}`,
      urgency: doc.status === "Missing" ? "Missing file" : doc.status,
      found: `${doc.title} is linked to ${doc.client}.`,
      prepared: "Churvox prepared a document review slip.",
      why: doc.note,
      owner: "Upload file, mark reviewed, open client, or open job.",
      area: "Documents",
      page: "documents",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "document-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshDocuments({ onNavigate }) {
  const [docs, setDocs] = React.useState(readDocs);
  const [selectedId, setSelectedId] = React.useState(() => readDocs()[0]?.id || "");
  const selected = docs.find((item) => item.id === selectedId) || docs[0];

  const uploaded = docs.filter((item) => item.status === "Uploaded").length;
  const missing = docs.filter((item) => item.status === "Missing").length;
  const review = docs.filter((item) => item.status === "Needs review").length;

  function updateDoc(id, patch) {
    setDocs((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveDocs(next);
      return next;
    });
  }

  function addDoc() {
    const next = {
      id: `doc-${Date.now()}`,
      title: "New document",
      type: "Job file",
      client: "New client",
      job: "New job",
      status: "Missing",
      owner: "Owner",
      date: "Today",
      note: "Add document details here.",
    };

    const updated = [next, ...docs];
    setDocs(updated);
    setSelectedId(next.id);
    saveDocs(updated);
  }

  function resetDocs() {
    setDocs(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveDocs(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendDocToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshDocumentsPage">
      <div className="freshDocumentsHero">
        <div>
          <span>Documents / files</span>
          <h1>Keep every job file in one place</h1>
          <p>Track receipts, signed quotes, access instructions, safety forms and missing uploads before they cause admin problems.</p>
        </div>

        <div className="freshDocumentsStats">
          <div><b>{docs.length}</b><small>files</small></div>
          <div><b>{uploaded}</b><small>uploaded</small></div>
          <div><b>{missing}</b><small>missing</small></div>
          <div><b>{review}</b><small>review</small></div>
        </div>
      </div>

      <div className="freshDocumentsLayout">
        <aside className="freshDocumentsList">
          <header>
            <div>
              <b>File queue</b>
              <span>Job + customer documents</span>
            </div>
            <button type="button" onClick={addDoc}>Add</button>
          </header>

          {docs.map((doc) => (
            <button
              type="button"
              key={doc.id}
              className={selected?.id === doc.id ? "active" : ""}
              onClick={() => setSelectedId(doc.id)}
            >
              <b>{doc.title}</b>
              <span>{doc.client}</span>
              <small>{doc.status} · {doc.type}</small>
            </button>
          ))}

          <button type="button" className="freshDocumentsReset" onClick={resetDocs}>
            Reset documents
          </button>
        </aside>

        {selected && (
          <article className="freshDocumentsDetail">
            <div className="freshDocumentsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.client} · {selected.job}</p>
              </div>

              <div className="freshDocumentsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              </div>
            </div>

            <div className="freshDocumentsCards">
              <section>
                <span>Type</span>
                <b>{selected.type}</b>
                <p>Used to keep documents sorted by job, client or expense.</p>
              </section>

              <section>
                <span>Owner</span>
                <b>{selected.owner}</b>
                <p>Who needs to upload, review or approve the file.</p>
              </section>

              <section>
                <span>Date</span>
                <b>{selected.date}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshDocumentsForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateDoc(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateDoc(selected.id, { type: event.target.value })}>
                  <option>Job file</option>
                  <option>Quote</option>
                  <option>Invoice</option>
                  <option>Receipt</option>
                  <option>Photo proof</option>
                  <option>Safety form</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateDoc(selected.id, { status: event.target.value })}>
                  <option>Uploaded</option>
                  <option>Missing</option>
                  <option>Needs review</option>
                  <option>Approved</option>
                  <option>Archived</option>
                </select>
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateDoc(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateDoc(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateDoc(selected.id, { owner: event.target.value })} />
              </label>

              <label>
                <span>Date</span>
                <input value={selected.date} onChange={(event) => updateDoc(selected.id, { date: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateDoc(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshDocumentsActions">
              <button type="button" onClick={() => updateDoc(selected.id, { status: "Uploaded" })}>Mark uploaded</button>
              <button type="button" onClick={() => updateDoc(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateDoc(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => onNavigate?.("expenses")}>Open Expenses</button>
              <button type="button" onClick={() => onNavigate?.("photos")}>Open Photos</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
