import React from "react";
import { useApi } from "../hooks/useApi";

const INDUSTRIES_KEY = "churvox:trade-settings:v1";

const defaults = [
  { id: "in-1", industry: "Lawn care / gardening", status: "Active", priority: "High", defaultServices: "Mowing, edging, hedge trimming, green waste, overgrown reset", jobFlow: "Quote → Schedule → Complete → Photos → Invoice", template: "Fortnightly maintenance, one-off tidy, overgrown reset", note: "Use this trade setup for lawn and garden work.", nextAction: "Keep services and templates updated." },
  { id: "in-2", industry: "Cleaning", status: "Draft", priority: "Medium", defaultServices: "Regular clean, deep clean, move-out clean, windows, extras", jobFlow: "Booking → Checklist → Complete → Photos → Invoice", template: "Weekly clean, fortnightly clean, one-off deep clean", note: "Useful for recurring jobs and checklist work.", nextAction: "Add cleaning templates before using with customers." },
  { id: "in-3", industry: "Handyman / maintenance", status: "Needs review", priority: "Medium", defaultServices: "Repairs, small installs, painting touch-ups, odd jobs, callout", jobFlow: "Request → Quote → Job notes → Materials → Invoice", template: "Hourly job, fixed repair, fixed + materials", note: "Useful for mixed job types and material tracking.", nextAction: "Review materials and pricing wording." },
];

const statuses = ["Active", "Draft", "Needs review", "Paused"];
const priorities = ["High", "Medium", "Low"];
const flowPresets = ["Quote → Schedule → Complete → Photos → Invoice", "Booking → Checklist → Complete → Photos → Invoice", "Request → Quote → Job notes → Materials → Invoice", "Callout → Job notes → Complete → Invoice"];

function readIndustries() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(INDUSTRIES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch { return defaults; }
}

function saveIndustries(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INDUSTRIES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "industries" } }));
    }
  } catch {}
}

export default function FreshIndustries({ onNavigate }) {
  const { patch } = useApi();
  const [items, setItems] = React.useState(readIndustries);
  const [selectedId, setSelectedId] = React.useState(() => readIndustries()[0]?.id || "");
  const [message, setMessage] = React.useState("");
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const total = items.length;
  const active = items.filter((item) => item.status === "Active").length;
  const review = items.filter((item) => item.status === "Needs review").length;

  function updateItem(id, patchData) {
    setMessage("");
    setItems((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patchData } : item);
      saveIndustries(next);
      return next;
    });
  }

  function addIndustry() {
    const next = { id: `in-${Date.now()}`, industry: "New trade", status: "Draft", priority: "Medium", defaultServices: "", jobFlow: flowPresets[0], template: "", note: "", nextAction: "" };
    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveIndustries(updated);
  }

  async function saveSelectedAsMainTrade() {
    if (!selected) return;
    try {
      await patch("/user/trade", { trade_type: selected.industry });
      setMessage(`${selected.industry} saved as the main business trade.`);
    } catch {
      setMessage("Trade settings saved on this workspace.");
    }
  }

  return (
    <section className="freshIndustriesPage">
      <div className="freshIndustriesHero"><div><span>Trade settings</span><h1>Set the services and workflows your business uses</h1><p>Choose the trade, default services, job flow and templates that Churvox should use for your work.</p></div><div className="freshIndustriesStats"><div><b>{total}</b><small>trades</small></div><div><b>{active}</b><small>active</small></div><div><b>{review}</b><small>review</small></div></div></div>
      {message ? <section className="freshCard freshItem"><b>Saved</b><span>{message}</span></section> : null}
      <div className="freshIndustriesLayout">
        <aside className="freshIndustriesList"><header><div><b>Trades</b><span>{active} active</span></div><button type="button" onClick={addIndustry}>Add</button></header>{items.map((item) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><b>{item.industry}</b><span>{item.status} · {item.priority}</span><small>{item.defaultServices || "No services added yet"}</small></button>)}</aside>
        {selected ? <article className="freshIndustriesDetail"><div className="freshIndustriesHead"><div><span>{selected.status}</span><h2>{selected.industry}</h2><p>{selected.priority} priority · business trade settings</p></div><div className="freshIndustriesHeadActions"><button type="button" onClick={saveSelectedAsMainTrade}>Save as main trade</button><button type="button" onClick={() => onNavigate?.("services")}>Open Services</button><button type="button" onClick={() => onNavigate?.("templates")}>Open Templates</button></div></div><div className="freshIndustriesCards"><section><span>Default services</span><b>{selected.industry}</b><p>{selected.defaultServices || "Add services below."}</p></section><section><span>Job flow</span><b>{selected.status}</b><p>{selected.jobFlow}</p></section><section><span>Templates</span><b>{selected.priority}</b><p>{selected.template || "Add template wording below."}</p></section></div><div className="freshIndustriesForm"><label><span>Trade</span><input value={selected.industry} onChange={(e) => updateItem(selected.id, { industry: e.target.value })} /></label><label><span>Status</span><select value={selected.status} onChange={(e) => updateItem(selected.id, { status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label><span>Priority</span><select value={selected.priority} onChange={(e) => updateItem(selected.id, { priority: e.target.value })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label className="wide"><span>Job flow preset</span><select value={selected.jobFlow} onChange={(e) => updateItem(selected.id, { jobFlow: e.target.value })}>{flowPresets.map((flow) => <option key={flow}>{flow}</option>)}</select></label><label className="wide"><span>Default services</span><textarea value={selected.defaultServices} onChange={(e) => updateItem(selected.id, { defaultServices: e.target.value })} /></label><label className="wide"><span>Templates</span><textarea value={selected.template} onChange={(e) => updateItem(selected.id, { template: e.target.value })} /></label><label className="wide"><span>Owner note</span><textarea value={selected.note} onChange={(e) => updateItem(selected.id, { note: e.target.value })} /></label></div><div className="freshIndustriesActions"><button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Make active</button><button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button><button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button><button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button></div></article> : null}
      </div>
    </section>
  );
}
