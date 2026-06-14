import React from "react";
import { useApi } from "../hooks/useApi";

const INDUSTRIES_KEY = "churvox:trade-settings:v2";

const tradePresets = {
  "Lawn care / gardening": {
    defaultServices: "Mowing, edging, hedge trimming, green waste, overgrown reset",
    jobFlow: "Quote → Schedule → Complete → Photos → Invoice",
    template: "Fortnightly maintenance, one-off tidy, overgrown reset",
  },
  Cleaning: {
    defaultServices: "Regular clean, deep clean, move-out clean, windows, extras",
    jobFlow: "Booking → Checklist → Complete → Photos → Invoice",
    template: "Weekly clean, fortnightly clean, one-off deep clean",
  },
  "Handyman / maintenance": {
    defaultServices: "Repairs, installs, painting touch-ups, odd jobs, callout",
    jobFlow: "Request → Quote → Job notes → Materials → Invoice",
    template: "Hourly job, fixed repair, fixed + materials",
  },
  Plumbing: {
    defaultServices: "Callouts, repairs, installs, maintenance, urgent jobs",
    jobFlow: "Request → Schedule → Job notes → Complete → Invoice",
    template: "Callout repair, install quote, urgent job",
  },
  Electrical: {
    defaultServices: "Faults, installs, maintenance, safety checks, callouts",
    jobFlow: "Request → Quote → Schedule → Complete → Invoice",
    template: "Fault callout, install quote, maintenance visit",
  },
  Painting: {
    defaultServices: "Interior painting, exterior painting, prep, patching, touch-ups",
    jobFlow: "Quote → Deposit/checklist → Schedule → Complete → Invoice",
    template: "Room quote, exterior quote, touch-up job",
  },
  "Pest control": {
    defaultServices: "Treatment visits, inspections, follow-ups, recurring service",
    jobFlow: "Booking → Treatment notes → Follow-up → Invoice",
    template: "One-off treatment, recurring treatment, inspection",
  },
  Other: {
    defaultServices: "Add your services here",
    jobFlow: "Request → Quote → Schedule → Complete → Invoice",
    template: "One-off job, recurring job, quoted work",
  },
};

const defaultItems = [
  { id: "trade-1", trade: "Lawn care / gardening", status: "Active", priority: "High", ...tradePresets["Lawn care / gardening"], note: "Use for your regular service work." },
  { id: "trade-2", trade: "Cleaning", status: "Inactive", priority: "Medium", ...tradePresets.Cleaning, note: "Activate if this is part of your business." },
  { id: "trade-3", trade: "Handyman / maintenance", status: "Inactive", priority: "Medium", ...tradePresets["Handyman / maintenance"], note: "Activate if this is part of your business." },
];

const statuses = ["Active", "Inactive", "Needs review"];
const priorities = ["High", "Medium", "Low"];
const flowPresets = [...new Set(Object.values(tradePresets).map((preset) => preset.jobFlow))];
const tradeOptions = Object.keys(tradePresets);

function normalise(item) {
  return {
    id: item.id || `trade-${Date.now()}`,
    trade: item.trade || item.industry || "Other",
    status: item.status || "Inactive",
    priority: item.priority || "Medium",
    defaultServices: item.defaultServices || "",
    jobFlow: item.jobFlow || flowPresets[0],
    template: item.template || "",
    note: item.note || "",
  };
}

function readIndustries() {
  try {
    if (typeof window === "undefined") return defaultItems;
    const saved = window.localStorage.getItem(INDUSTRIES_KEY) || window.localStorage.getItem("churvox:trade-settings:v1");
    if (!saved) return defaultItems;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalise) : defaultItems;
  } catch {
    return defaultItems;
  }
}

function saveIndustries(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INDUSTRIES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "trade-settings" } }));
    }
  } catch {}
}

export default function FreshIndustries({ onNavigate }) {
  const { patch } = useApi();
  const [items, setItems] = React.useState(readIndustries);
  const [selectedId, setSelectedId] = React.useState(() => readIndustries()[0]?.id || "");
  const [message, setMessage] = React.useState("");
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const active = items.filter((item) => item.status === "Active").length;

  function persist(next) {
    setItems(next);
    saveIndustries(next);
  }

  function updateItem(id, patchData) {
    setMessage("");
    persist(items.map((item) => item.id === id ? { ...item, ...patchData } : item));
  }

  function applyTradePreset(trade) {
    if (!selected) return;
    const preset = tradePresets[trade] || tradePresets.Other;
    updateItem(selected.id, { trade, ...preset });
  }

  function addIndustry() {
    const next = { id: `trade-${Date.now()}`, trade: "Other", status: "Needs review", priority: "Medium", ...tradePresets.Other, note: "Add the services and workflow for this part of your business." };
    const updated = [next, ...items];
    persist(updated);
    setSelectedId(next.id);
  }

  function removeSelected() {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    persist(next.length ? next : defaultItems);
    setSelectedId((next[0] || defaultItems[0]).id);
  }

  async function saveSelectedAsMainTrade() {
    if (!selected) return;
    try {
      await patch("/user/trade", { trade_type: selected.trade });
      setMessage(`${selected.trade} saved as your main business trade.`);
    } catch {
      setMessage("Trade settings saved in this workspace.");
    }
  }

  return (
    <section className="freshIndustriesPage">
      <div className="freshIndustriesHero">
        <div>
          <span>Business services</span>
          <h1>Set the trades, services and workflows your business uses</h1>
          <p>Choose your trade type, set default services, pick a job flow, and keep wording ready for jobs, quotes and invoices.</p>
        </div>
        <div className="freshIndustriesStats"><div><b>{items.length}</b><small>trades</small></div><div><b>{active}</b><small>active</small></div><div><b>{items.length - active}</b><small>inactive</small></div></div>
      </div>

      {message ? <section className="freshCard freshItem"><b>Saved</b><span>{message}</span></section> : null}

      <div className="freshIndustriesLayout">
        <aside className="freshIndustriesList">
          <header><div><b>Business service areas</b><span>{active} active</span></div><button type="button" onClick={addIndustry}>Add</button></header>
          {items.map((item) => (
            <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <b>{item.trade}</b><span>{item.status} · {item.priority}</span><small>{item.defaultServices || "No services added yet"}</small>
            </button>
          ))}
        </aside>

        {selected ? (
          <article className="freshIndustriesDetail">
            <div className="freshIndustriesHead">
              <div><span>{selected.status}</span><h2>{selected.trade}</h2><p>{selected.priority} priority · customer workflow settings</p></div>
              <div className="freshIndustriesHeadActions"><button type="button" onClick={saveSelectedAsMainTrade}>Save as main trade</button><button type="button" onClick={() => onNavigate?.("services")}>Open Services</button><button type="button" onClick={() => onNavigate?.("templates")}>Open Templates</button></div>
            </div>

            <div className="freshIndustriesCards">
              <section><span>Default services</span><b>{selected.trade}</b><p>{selected.defaultServices || "Add services below."}</p></section>
              <section><span>Job flow</span><b>{selected.status}</b><p>{selected.jobFlow}</p></section>
              <section><span>Quote/invoice wording</span><b>{selected.priority}</b><p>{selected.template || "Add template wording below."}</p></section>
            </div>

            <div className="freshIndustriesForm">
              <label><span>Trade type</span><select value={selected.trade} onChange={(e) => applyTradePreset(e.target.value)}>{tradeOptions.map((trade) => <option key={trade}>{trade}</option>)}</select></label>
              <label><span>Status</span><select value={selected.status} onChange={(e) => updateItem(selected.id, { status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label><span>Priority</span><select value={selected.priority} onChange={(e) => updateItem(selected.id, { priority: e.target.value })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label className="wide"><span>Job flow</span><select value={selected.jobFlow} onChange={(e) => updateItem(selected.id, { jobFlow: e.target.value })}>{flowPresets.map((flow) => <option key={flow}>{flow}</option>)}</select></label>
              <label className="wide"><span>Default services</span><textarea value={selected.defaultServices} onChange={(e) => updateItem(selected.id, { defaultServices: e.target.value })} /></label>
              <label className="wide"><span>Quote / invoice wording</span><textarea value={selected.template} onChange={(e) => updateItem(selected.id, { template: e.target.value })} /></label>
              <label className="wide"><span>Owner note</span><textarea value={selected.note} onChange={(e) => updateItem(selected.id, { note: e.target.value })} /></label>
            </div>

            <div className="freshIndustriesActions"><button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Make active</button><button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button><button type="button" onClick={removeSelected}>Remove</button><button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button><button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button></div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
