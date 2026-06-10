import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const proofJobs = [
  {
    id: "proof-1",
    job: "Belmont lawn reset",
    client: "Belmont Customer",
    photos: 4,
    status: "Ready",
    found: "Worker uploaded before and after photos.",
    prepared: "Customer completion message, invoice proof note and review request.",
    message: "Hi, the lawn reset is complete. I’ve attached before and after photos. Thanks again — invoice will follow shortly.",
    invoiceNote: "Photos confirm completed lawn reset and hedge tidy.",
    page: "photos",
  },
  {
    id: "proof-2",
    job: "Naenae handyman repair",
    client: "Naenae Property",
    photos: 2,
    status: "Needs review",
    found: "Photos uploaded but worker note says extra materials used.",
    prepared: "Add materials to invoice before sending proof message.",
    message: "Hi, the repair is complete. I’ve added photos for your records and will confirm materials before invoice is sent.",
    invoiceNote: "Check materials line before invoice.",
    page: "invoicecheck",
  },
  {
    id: "proof-3",
    job: "Upper Hutt quote visit",
    client: "Upper Hutt Lead",
    photos: 5,
    status: "Quote ready",
    found: "Site photos show overgrown lawn, hedge and green waste.",
    prepared: "Quote evidence and staged quote option.",
    message: "Thanks for the site visit. I’ve checked the photos and can offer a full reset or staged option.",
    invoiceNote: "Photos support quote line items.",
    page: "quoteai",
  },
];

function sendProofToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `photo-proof-${item.id}-${Date.now()}`,
      group: "AI Photo Proof",
      title: "Photo proof ready",
      info: `${item.client} · ${item.photos} photos · ${item.status}`,
      urgency: item.status === "Needs review" ? "High" : "Medium",
      found: item.found,
      prepared: item.message,
      why: item.invoiceNote,
      owner: "Approve message, attach to invoice, request review, or open photos.",
      area: "Photo Proof",
      page: "photoproof",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "photo-proof" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshPhotoProof({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(proofJobs[0].id);
  const selected = proofJobs.find((item) => item.id === selectedId) || proofJobs[0];
  const totalPhotos = proofJobs.reduce((sum, item) => sum + item.photos, 0);

  return (
    <section className="freshPhotoProofPage">
      <div className="freshPhotoProofHero">
        <div>
          <span>AI Photo Proof</span>
          <h1>Turn job photos into customer trust and invoice proof</h1>
          <p>Worker photos should not just sit in a gallery. Churvox uses them for completion updates, invoices, quotes and review requests.</p>
        </div>

        <div className="freshPhotoProofStats">
          <div><b>{proofJobs.length}</b><small>jobs</small></div>
          <div><b>{totalPhotos}</b><small>photos</small></div>
          <div><b>{selected.status}</b><small>status</small></div>
          <div><b>Proof</b><small>ready</small></div>
        </div>
      </div>

      <div className="freshPhotoProofLayout">
        <aside className="freshPhotoProofList">
          <header>
            <b>Photo proof jobs</b>
            <span>{totalPhotos} uploaded photos</span>
          </header>

          {proofJobs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.job}</b>
              <span>{item.client}</span>
              <small>{item.photos} photos · {item.status}</small>
            </button>
          ))}
        </aside>

        <article className="freshPhotoProofDetail">
          <header>
            <span>{selected.status}</span>
            <h2>{selected.job}</h2>
            <p>{selected.client} · {selected.photos} photos</p>
          </header>

          <div className="freshPhotoProofMock">
            {Array.from({ length: selected.photos }).map((_, index) => (
              <div key={index}>Photo {index + 1}</div>
            ))}
          </div>

          <div className="freshPhotoProofCards">
            <section><b>AI found</b><p>{selected.found}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
            <section><b>Invoice note</b><p>{selected.invoiceNote}</p></section>
          </div>

          <label>
            <span>Customer proof message</span>
            <textarea value={selected.message} readOnly />
          </label>

          <div className="freshPhotoProofButtons">
            <button type="button" onClick={() => sendProofToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("photos")}>Open Photos</button>
            <button type="button" onClick={() => onNavigate?.("reviews")}>Open Reviews</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
          </div>
        </article>
      </div>
    </section>
  );
}
