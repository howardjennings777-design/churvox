import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const LEADS_KEY = "churvox:fresh-leads:v1";
const QUOTES_KEY = "churvox:fresh-quotes:v1";
const JOBS_KEY = "churvox:fresh-jobs:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "lead-1",
    name: "Sarah from Naenae",
    source: "Website",
    status: "New",
    service: "Fortnightly lawn service",
    area: "Naenae, Lower Hutt",
    phone: "021 000 111",
    email: "hello@churvox.com",
    estimate: 65,
    note: "Small lawn, wants regular fortnightly service. Asked for price and next available slot.",
    nextStep: "Prepare quote",
  },
  {
    id: "lead-2",
    name: "Birchville Rentals",
    source: "Phone",
    status: "Needs info",
    service: "Driveway clean",
    area: "Upper Hutt",
    phone: "04 000 222",
    email: "hello@churvox.com",
    estimate: 140,
    note: "Needs tenant access confirmed before booking.",
    nextStep: "Confirm access",
  },
  {
    id: "lead-3",
    name: "Lower Hutt Medical Centre",
    source: "Referral",
    status: "Ready",
    service: "Garden tidy",
    area: "Lower Hutt",
    phone: "04 000 333",
    email: "hello@churvox.com",
    estimate: 240,
    note: "Commercial garden tidy. Wants a written quote first.",
    nextStep: "Create quote",
  },
];


function requestToLead(request) {
  const id = request.id || request._id || `request-${Date.now()}`;
  const service = request.service_needed || request.service || "Customer request";
  const area = request.address || request.area || "No address";
  const photos = Array.isArray(request.photos) ? request.photos : [];
  const preferred = request.preferred_day ? `Preferred: ${request.preferred_day}. ` : "";
  const urgency = request.urgency ? `Urgency: ${request.urgency}. ` : "";
  const photoText = photos.length ? `Photos attached: ${photos.length}. ` : "";

  return {
    id: `request-${id}`,
    backendRequestId: id,
    name: request.customer_name || request.name || "Customer request",
    source: "Website Request",
    status: request.status || "New",
    service,
    area,
    phone: request.customer_phone || request.phone || "",
    email: request.customer_email || request.email || "",
    estimate: Number(request.estimate || 0),
    note: `${preferred}${urgency}${photoText}${request.message || request.note || "Customer submitted a request from the public form."}`.trim(),
    nextStep: request.next_step || "Owner review",
    photos,
  };
}


function readList(key, fallback = []) {
  try {
    if (typeof window === "undefined") return fallback;

    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveList(key, items, type) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendLeadToCommand(lead) {
  try {
    const current = readList(COMMAND_INBOX_KEY, []);

    const slip = {
      id: `lead-${lead.id}-${Date.now()}`,
      group: "Leads",
      title: "New lead needs review",
      info: `${lead.name} · ${lead.service} · $${lead.estimate}`,
      urgency: lead.status === "New" ? "New request" : lead.status,
      found: `${lead.name} came from ${lead.source}.`,
      prepared: `Churvox prepared next step: ${lead.nextStep}.`,
      why: "New enquiries need quick follow-up so they do not go cold.",
      owner: "Create quote, create job, request more info, or mark handled.",
      area: "Leads",
      page: "leads",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    saveList(COMMAND_INBOX_KEY, [slip, ...current].slice(0, 20), "lead-command");
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshLeads({ onNavigate }) {
  const { get } = useApi();
  const { user } = useAuth();
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [leads, setLeads] = React.useState(() => readList(LEADS_KEY, defaults));
  const [selectedId, setSelectedId] = React.useState(() => readList(LEADS_KEY, defaults)[0]?.id || "");
  const selected = leads.find((item) => item.id === selectedId) || leads[0];
  const ownerEmail = String(user?.email || "").trim();
  const publicRequestLink = React.useMemo(() => {
    try {
      const url = new URL("/request", window.location.origin);
      if (ownerEmail) url.searchParams.set("owner", ownerEmail);
      return url.toString();
    } catch {
      return "/request";
    }
  }, [ownerEmail]);

  const newCount = leads.filter((item) => item.status === "New").length;
  const readyCount = leads.filter((item) => item.status === "Ready").length;
  const totalValue = leads.reduce((sum, item) => sum + Number(item.estimate || 0), 0);

  function saveLeads(next) {
    setLeads(next);
    saveList(LEADS_KEY, next, "leads");
  }

  React.useEffect(() => {
    let alive = true;

    async function loadCustomerRequests() {
      setRequestLoading(true);
      try {
        const result = await get("/customer-requests", { timeout: 25000 });
        const data = result?.data ?? result;
        const requests = Array.isArray(data?.requests) ? data.requests : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
        const requestLeads = requests.map(requestToLead);

        if (!alive || !requestLeads.length) return;

        setLeads((current) => {
          const seen = new Set(current.map((item) => item.id));
          const fresh = requestLeads.filter((item) => !seen.has(item.id));
          if (!fresh.length) return current;
          const next = [...fresh, ...current];
          saveList(LEADS_KEY, next, "customer-requests");
          setSelectedId((existing) => existing || fresh[0]?.id || "");
          return next;
        });
      } catch {
        // Keep manual/local request queue usable.
      } finally {
        if (alive) setRequestLoading(false);
      }
    }

    loadCustomerRequests();

    return () => {
      alive = false;
    };
  }, [get]);

  async function copyRequestLink() {
    try {
      await navigator.clipboard.writeText(publicRequestLink);
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "request-link-copied" } }));
    } catch {}
  }


  function updateLead(id, patch) {
    const next = leads.map((item) => (item.id === id ? { ...item, ...patch } : item));
    saveLeads(next);
  }

  function addLead() {
    const nextLead = {
      id: `lead-${Date.now()}`,
      name: "New lead",
      source: "Website",
      status: "New",
      service: "New service request",
      area: "Add area",
      phone: "",
      email: "",
      estimate: 0,
      note: "Add lead details here.",
      nextStep: "Prepare quote",
    };

    const next = [nextLead, ...leads];
    saveLeads(next);
    setSelectedId(nextLead.id);
  }

  function resetLeads() {
    saveLeads(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  function createQuoteFromLead() {
    if (!selected) return;

    const quotes = readList(QUOTES_KEY, []);
    const quote = {
      id: `Q-LEAD-${Date.now().toString().slice(-5)}`,
      client: selected.name,
      service: selected.service,
      status: "Draft",
      amount: Number(selected.estimate || 0),
      area: selected.area,
      note: `Created from lead: ${selected.note}`,
      lines: [`${selected.service} · $${Number(selected.estimate || 0).toFixed(2)}`],
    };

    saveList(QUOTES_KEY, [quote, ...quotes], "lead-quote");
    updateLead(selected.id, { status: "Quoted", nextStep: "Follow up quote" });
    onNavigate?.("quotes");
  }

  function createJobFromLead() {
    if (!selected) return;

    const jobs = readList(JOBS_KEY, []);
    const job = {
      id: `J-LEAD-${Date.now().toString().slice(-5)}`,
      client: selected.name,
      title: selected.service,
      status: "Draft",
      area: selected.area,
      worker: "Unassigned",
      price: Number(selected.estimate || 0),
      note: `Created from lead: ${selected.note}`,
    };

    saveList(JOBS_KEY, [job, ...jobs], "lead-job");
    updateLead(selected.id, { status: "Converted", nextStep: "Schedule job" });
    onNavigate?.("jobs");
  }

  function sendToCommand() {
    if (!selected) return;
    sendLeadToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshLeadsPage">
      <div className="freshLeadsHero">
        <div>
          <span>Leads / requests</span>
          <h1>Turn enquiries into real work</h1>
          <p>Capture new requests, prepare quotes, create jobs, and keep every new customer follow-up visible.</p>
        </div>

        <div className="freshLeadsStats">
          <div><b>{leads.length}</b><small>requests</small></div>
          <div><b>{newCount}</b><small>new</small></div>
          <div><b>{readyCount}</b><small>ready</small></div>
          <div><b>${totalValue}</b><small>value</small></div>
        </div>
      </div>

      <section className="freshPublicRequestLink">
        <div>
          <b>Public request form</b>
          <span>Share this link so customers can request work. Requests come here first for owner review.</span>
        </div>
        <div>
          <a href={publicRequestLink} target="_blank" rel="noreferrer">Open request form</a>
          <button type="button" onClick={copyRequestLink}>Copy link</button>
        </div>
      </section>

      <div className="freshLeadsLayout">
        <aside className="freshLeadsList">
          <header>
            <div>
              <b>Lead queue</b>
              <span>{requestLoading ? "Checking website requests..." : "New work before quote/job"}</span>
            </div>
            <button type="button" onClick={addLead}>Add</button>
          </header>

          {leads.map((lead) => (
            <button
              type="button"
              key={lead.id}
              className={selected?.id === lead.id ? "active" : ""}
              onClick={() => setSelectedId(lead.id)}
            >
              <b>{lead.name}</b>
              <span>{lead.service}</span>
              <small>{lead.status} · ${lead.estimate}</small>
            </button>
          ))}

          <button type="button" className="freshLeadsReset" onClick={resetLeads}>
            Reset leads
          </button>
        </aside>

        {selected && (
          <article className="freshLeadsDetail">
            <div className="freshLeadsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.source} · {selected.area}</p>
              </div>

              <div className="freshLeadsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={createQuoteFromLead}>Create quote</button>
                <button type="button" onClick={createJobFromLead}>Create job</button>
              </div>
            </div>

            <div className="freshLeadsCards">
              <section>
                <span>Service</span>
                <b>{selected.service}</b>
                <p>{selected.note}</p>
              </section>

              <section>
                <span>Estimate</span>
                <b>${selected.estimate}</b>
                <p>Use this as the quote or job starting price.</p>
              </section>

              {selected.photos?.length ? (
                <section>
                  <span>Photos</span>
                  <b>{selected.photos.length} attached</b>
                  <p>Customer supplied photos with this request.</p>
                </section>
              ) : null}

              <section>
                <span>Next step</span>
                <b>{selected.nextStep}</b>
                <p>Command can remind the owner to follow this up.</p>
              </section>
            </div>

            <div className="freshLeadsForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateLead(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Source</span>
                <select value={selected.source} onChange={(event) => updateLead(selected.id, { source: event.target.value })}>
                  <option>Website</option>
                  <option>Phone</option>
                  <option>Email</option>
                  <option>Referral</option>
                  <option>Facebook</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateLead(selected.id, { status: event.target.value })}>
                  <option>New</option>
                  <option>Needs info</option>
                  <option>Ready</option>
                  <option>Quoted</option>
                  <option>Converted</option>
                  <option>Lost</option>
                </select>
              </label>

              <label>
                <span>Service</span>
                <input value={selected.service} onChange={(event) => updateLead(selected.id, { service: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <input value={selected.area} onChange={(event) => updateLead(selected.id, { area: event.target.value })} />
              </label>

              <label>
                <span>Estimate</span>
                <input type="number" value={selected.estimate} onChange={(event) => updateLead(selected.id, { estimate: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Phone</span>
                <input value={selected.phone} onChange={(event) => updateLead(selected.id, { phone: event.target.value })} />
              </label>

              <label>
                <span>Email</span>
                <input value={selected.email} onChange={(event) => updateLead(selected.id, { email: event.target.value })} />
              </label>

              <label>
                <span>Next step</span>
                <input value={selected.nextStep} onChange={(event) => updateLead(selected.id, { nextStep: event.target.value })} />
              </label>

              <label className="wide">
                <span>Notes</span>
                <textarea value={selected.note} onChange={(event) => updateLead(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshLeadsActions">
              <button type="button" onClick={() => updateLead(selected.id, { status: "Ready" })}>Mark ready</button>
              <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
              <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
