import React from "react";

const ASSETS_KEY = "churvox:fresh-assets:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "asset-1",
    name: "Ute 1",
    type: "Vehicle",
    status: "Ready",
    assigned: "Matiu Rangi",
    location: "Lower Hutt",
    serviceDue: "In 18 days",
    note: "Main run vehicle. Clean and ready.",
    risk: "Keep WOF/service dates visible before assigning routes.",
  },
  {
    id: "asset-2",
    name: "Mower 2",
    type: "Equipment",
    status: "Needs service",
    assigned: "Ana Williams",
    location: "Workshop",
    serviceDue: "Overdue",
    note: "Blade service needed before heavy lawn run.",
    risk: "Could slow worker down or produce poor finish.",
  },
  {
    id: "asset-3",
    name: "Hedge kit",
    type: "Tool set",
    status: "Checked out",
    assigned: "Worker app",
    location: "On job",
    serviceDue: "Next month",
    note: "Assigned to garden tidy work.",
    risk: "Track who has it before booking hedge jobs.",
  },
];

function readAssets() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(ASSETS_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveAssets(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ASSETS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "assets" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendAssetToCommand(asset) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `asset-${asset.id}-${Date.now()}`,
      group: "Assets",
      title: "Equipment needs owner review",
      info: `${asset.name} · ${asset.status} · ${asset.serviceDue}`,
      urgency: asset.status === "Needs service" ? "Maintenance risk" : "Asset check",
      found: `${asset.name} is marked ${asset.status}.`,
      prepared: "Churvox prepared an equipment review slip.",
      why: asset.risk,
      owner: "Approve use, schedule service, reassign, or remove from route planning.",
      area: "Assets",
      page: "assets",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "asset-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAssets({ onNavigate }) {
  const [assets, setAssets] = React.useState(readAssets);
  const [selectedId, setSelectedId] = React.useState(() => readAssets()[0]?.id || "");
  const selected = assets.find((item) => item.id === selectedId) || assets[0];

  const ready = assets.filter((item) => item.status === "Ready").length;
  const service = assets.filter((item) => item.status === "Needs service").length;
  const checkedOut = assets.filter((item) => item.status === "Checked out").length;

  function updateAsset(id, patch) {
    setAssets((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveAssets(next);
      return next;
    });
  }

  function addAsset() {
    const next = {
      id: `asset-${Date.now()}`,
      name: "New asset",
      type: "Equipment",
      status: "Ready",
      assigned: "Unassigned",
      location: "Workshop",
      serviceDue: "Not set",
      note: "Add notes here.",
      risk: "Owner should check before assigning to a job.",
    };

    const updated = [next, ...assets];
    setAssets(updated);
    setSelectedId(next.id);
    saveAssets(updated);
  }

  function resetAssets() {
    setAssets(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveAssets(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendAssetToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAssetsPage">
      <div className="freshAssetsHero">
        <div>
          <span>Assets / equipment</span>
          <h1>Know what gear is ready</h1>
          <p>Track vehicles, mowers, tools, service risk and who has what before work is assigned.</p>
        </div>

        <div className="freshAssetsStats">
          <div><b>{assets.length}</b><small>assets</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{service}</b><small>service</small></div>
          <div><b>{checkedOut}</b><small>checked out</small></div>
        </div>
      </div>

      <div className="freshAssetsLayout">
        <aside className="freshAssetsList">
          <header>
            <div>
              <b>Equipment list</b>
              <span>Service and assignment</span>
            </div>
            <button type="button" onClick={addAsset}>Add</button>
          </header>

          {assets.map((asset) => (
            <button
              type="button"
              key={asset.id}
              className={selected?.id === asset.id ? "active" : ""}
              onClick={() => setSelectedId(asset.id)}
            >
              <b>{asset.name}</b>
              <span>{asset.type}</span>
              <small>{asset.status} · {asset.serviceDue}</small>
            </button>
          ))}

          <button type="button" className="freshAssetsReset" onClick={resetAssets}>
            Reset assets
          </button>
        </aside>

        {selected && (
          <article className="freshAssetsDetail">
            <div className="freshAssetsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.type} · {selected.location}</p>
              </div>

              <div className="freshAssetsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
              </div>
            </div>

            <div className="freshAssetsCards">
              <section>
                <span>Assigned to</span>
                <b>{selected.assigned}</b>
                <p>Shows who has it or who should use it next.</p>
              </section>

              <section>
                <span>Service due</span>
                <b>{selected.serviceDue}</b>
                <p>{selected.risk}</p>
              </section>

              <section>
                <span>Current note</span>
                <b>{selected.location}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshAssetsForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateAsset(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateAsset(selected.id, { type: event.target.value })}>
                  <option>Vehicle</option>
                  <option>Equipment</option>
                  <option>Tool set</option>
                  <option>Trailer</option>
                  <option>Safety gear</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateAsset(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>Checked out</option>
                  <option>Needs service</option>
                  <option>Blocked</option>
                  <option>Retired</option>
                </select>
              </label>

              <label>
                <span>Assigned</span>
                <input value={selected.assigned} onChange={(event) => updateAsset(selected.id, { assigned: event.target.value })} />
              </label>

              <label>
                <span>Location</span>
                <input value={selected.location} onChange={(event) => updateAsset(selected.id, { location: event.target.value })} />
              </label>

              <label>
                <span>Service due</span>
                <input value={selected.serviceDue} onChange={(event) => updateAsset(selected.id, { serviceDue: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateAsset(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Risk</span>
                <textarea value={selected.risk} onChange={(event) => updateAsset(selected.id, { risk: event.target.value })} />
              </label>
            </div>

            <div className="freshAssetsActions">
              <button type="button" onClick={() => updateAsset(selected.id, { status: "Ready" })}>Mark ready</button>
              <button type="button" onClick={() => updateAsset(selected.id, { status: "Needs service" })}>Needs service</button>
              <button type="button" onClick={() => updateAsset(selected.id, { status: "Checked out" })}>Checked out</button>
              <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
              <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
