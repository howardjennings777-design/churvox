import React from "react";
import { readFreshFocus } from "./freshFocus";

const DISPATCH_STORAGE_KEY = "churvox:fresh-dispatch:v1";

const seedDispatch = [
  {
    id: "dispatch-1",
    job: "Lawn service",
    client: "Aroha Property Care",
    worker: "Matiu Rangi",
    status: "Ready",
    time: "10:00 AM",
    address: "Naenae, Lower Hutt",
    access: "Gate open, use side path",
    notes: "Photos required after completion.",
  },
  {
    id: "dispatch-2",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    worker: "Ana Williams",
    status: "On site",
    time: "1:30 PM",
    address: "Lower Hutt",
    access: "Reception knows worker is coming",
    notes: "Quiet work near front entry.",
  },
  {
    id: "dispatch-3",
    job: "Driveway clean",
    client: "Birchville Rentals",
    worker: "Unassigned",
    status: "Blocked",
    time: "Tomorrow 9:00 AM",
    address: "Upper Hutt",
    access: "Tenant access not confirmed",
    notes: "Do not dispatch until access confirmed.",
  },
  {
    id: "dispatch-4",
    job: "Hedge trim",
    client: "Aroha Property Care",
    worker: "Matiu Rangi",
    status: "Unconfirmed",
    time: "Tomorrow 2:00 PM",
    address: "Naenae, Lower Hutt",
    access: "Needs worker acknowledgement",
    notes: "Check ladder needed.",
  },
];

const lanes = ["Unconfirmed", "Ready", "On site", "Complete", "Blocked"];

function loadDispatch() {
  try {
    if (typeof window === "undefined") return seedDispatch;

    const saved = window.localStorage.getItem(DISPATCH_STORAGE_KEY);
    if (!saved) return seedDispatch;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedDispatch;
  } catch {
    return seedDispatch;
  }
}

export default function FreshDispatch({ onNavigate }) {
  const [items, setItems] = React.useState(loadDispatch);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("dispatch", items[0]?.id || ""));

  const selected = items.find((item) => item.id === selectedId) || items[0];

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DISPATCH_STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [items]);

  function updateSelectedDispatch(patch) {
    if (!selected) return;

    setItems((current) =>
      current.map((item) =>
        item.id === selected.id
          ? { ...item, ...patch }
          : item
      )
    );
  }

  function resetDispatch() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DISPATCH_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setItems(seedDispatch);
    setSelectedId(seedDispatch[0].id);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Dispatch</span>
        <h1>Dispatch</h1>
        <p>Control the day, watch worker acknowledgement, confirm access and keep risky work out of the route.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{items.filter((item) => item.status === "Ready").length}</h2>
          <p>Ready</p>
        </aside>
        <aside className="freshCard">
          <h2>{items.filter((item) => item.status === "On site").length}</h2>
          <p>On site</p>
        </aside>
        <aside className="freshCard">
          <h2>{items.filter((item) => item.status === "Blocked").length}</h2>
          <p>Blocked</p>
        </aside>
      </section>

      <section className="freshDispatchBoard">
        {lanes.map((lane) => (
          <section className={`freshDispatchLane ${lane.toLowerCase().replace(/\s+/g, "-")}`} key={lane}>
            <header>
              <b>{lane}</b>
              <span>{items.filter((item) => item.status === lane).length}</span>
            </header>

            {items
              .filter((item) => item.status === lane)
              .map((item) => (
                <button
                  type="button"
                  className={selected?.id === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <strong>{item.job}</strong>
                  <span>{item.client}</span>
                  <small>{item.time} · {item.worker}</small>
                </button>
              ))}

            {items.filter((item) => item.status === lane).length === 0 && (
              <div className="freshDispatchEmpty">Nothing here</div>
            )}
          </section>
        ))}
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>{selected?.job || "Select dispatch item"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Client</span>
                  <b>{selected.client}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Worker</span>
                  <b>{selected.worker}</b>
                </div>
                <div>
                  <span>Time</span>
                  <b>{selected.time}</b>
                </div>
              </div>

              <label className="freshField">
                <span>Address</span>
                <input
                  value={selected.address}
                  onChange={(event) => updateSelectedDispatch({ address: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Access instructions</span>
                <textarea
                  value={selected.access}
                  onChange={(event) => updateSelectedDispatch({ access: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Dispatch notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(event) => updateSelectedDispatch({ notes: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedDispatch({ status: "Ready" })}>
              Confirm route
            </button>
            <button className="freshOrange" onClick={() => updateSelectedDispatch({ status: "On site" })}>
              Mark on site
            </button>
            <button className="freshDark" onClick={() => updateSelectedDispatch({ status: "Complete" })}>
              Mark complete
            </button>
            <button className="freshGhost" onClick={() => updateSelectedDispatch({ status: "Blocked" })}>
              Block job
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("team")}>
              Reassign worker
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetDispatch}>
              Reset dispatch
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
