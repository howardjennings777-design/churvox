import React from "react";

const ROUTES_KEY = "churvox:fresh-routes:v1";
const DISPATCH_KEY = "churvox:fresh-dispatch:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "route-1",
    order: 1,
    job: "Lawn service",
    client: "Aroha Property Care",
    address: "Naenae, Lower Hutt",
    worker: "Matiu Rangi",
    window: "10:00 AM",
    duration: "2.0 hrs",
    status: "Ready",
    risk: "Clean access",
  },
  {
    id: "route-2",
    order: 2,
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    address: "Lower Hutt",
    worker: "Ana Williams",
    window: "1:30 PM",
    duration: "3.5 hrs",
    status: "On route",
    risk: "Customer site",
  },
  {
    id: "route-3",
    order: 3,
    job: "Driveway clean",
    client: "Birchville Rentals",
    address: "Upper Hutt",
    worker: "Unassigned",
    window: "Tomorrow 9:00 AM",
    duration: "2.5 hrs",
    status: "Blocked",
    risk: "Access not confirmed",
  },
];

function readRoutes() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(ROUTES_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveRoutes(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROUTES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "routes" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function readDispatch() {
  try {
    const saved = window.localStorage.getItem(DISPATCH_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushToDispatch(items) {
  try {
    const current = readDispatch();
    const seen = new Set(current.map((item) => item.id));

    const routeDispatch = items.map((item) => ({
      id: `route-dispatch-${item.id}`,
      job: item.job,
      client: item.client,
      worker: item.worker,
      status: item.status === "Blocked" ? "Blocked" : "Ready",
      time: item.window,
      address: item.address,
      access: item.risk,
      notes: `Route order ${item.order}. Duration ${item.duration}.`,
    }));

    const merged = [
      ...routeDispatch.filter((item) => !seen.has(item.id)),
      ...current,
    ];

    window.localStorage.setItem(DISPATCH_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "route-dispatch" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRouteIssueToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const issue = {
      id: `route-${item.id}-${Date.now()}`,
      group: "Routes",
      title: "Route needs owner review",
      info: `${item.client} · ${item.job} · ${item.status}`,
      urgency: item.status === "Blocked" ? "Access risk" : "Schedule check",
      found: `${item.job} is ${item.status.toLowerCase()} on the route.`,
      prepared: "Churvox prepared a route review slip for the owner.",
      why: item.risk || "Route issues can waste worker time or cause customer delays.",
      owner: "Fix access, reorder the run, reassign the worker or move it back to Dispatch.",
      area: "Routes",
      page: "routes",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([issue, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "route-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshRoutes({ onNavigate }) {
  const [routes, setRoutes] = React.useState(readRoutes);
  const [selectedId, setSelectedId] = React.useState(() => readRoutes()[0]?.id || "");
  const selected = routes.find((item) => item.id === selectedId) || routes[0];

  const sorted = [...routes].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const blocked = routes.filter((item) => item.status === "Blocked").length;
  const onRoute = routes.filter((item) => item.status === "On route").length;
  const completed = routes.filter((item) => item.status === "Completed").length;

  function updateRoute(id, patch) {
    setRoutes((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveRoutes(next);
      return next;
    });
  }

  function moveRoute(id, direction) {
    const ordered = [...sorted];
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= ordered.length) return;

    const moved = [...ordered];
    [moved[index], moved[target]] = [moved[target], moved[index]];

    const next = moved.map((item, idx) => ({ ...item, order: idx + 1 }));
    setRoutes(next);
    saveRoutes(next);
  }

  function optimizeRoute() {
    const statusRank = { "On route": 1, Ready: 2, Blocked: 9, Completed: 10, Skipped: 11 };

    const next = [...routes]
      .sort((a, b) => {
        const rankA = statusRank[a.status] || 5;
        const rankB = statusRank[b.status] || 5;
        return rankA - rankB || String(a.window).localeCompare(String(b.window));
      })
      .map((item, index) => ({ ...item, order: index + 1 }));

    setRoutes(next);
    saveRoutes(next);
  }

  function resetRoutes() {
    setRoutes(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveRoutes(defaults);
  }

  function addStop() {
    const next = {
      id: `route-${Date.now()}`,
      order: routes.length + 1,
      job: "New route stop",
      client: "New client",
      address: "Add address",
      worker: "Unassigned",
      window: "Today",
      duration: "1.0 hr",
      status: "Ready",
      risk: "Needs review",
    };

    const updated = [...routes, next];
    setRoutes(updated);
    setSelectedId(next.id);
    saveRoutes(updated);
  }

  function sendSelectedToCommand() {
    if (!selected) return;
    sendRouteIssueToCommand(selected);
    onNavigate?.("command");
  }

  function sendRouteToDispatch() {
    pushToDispatch(routes);
    onNavigate?.("dispatch");
  }

  return (
    <section className="freshRoutesPage">
      <div className="freshRoutesHero">
        <div>
          <span>Routes / Daily run</span>
          <h1>Plan the day before workers roll</h1>
          <p>Order jobs, catch blocked access, push routes to Dispatch, and keep the owner in control of changes.</p>
        </div>

        <div className="freshRoutesStats">
          <div><b>{routes.length}</b><small>stops</small></div>
          <div><b>{onRoute}</b><small>on route</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
          <div><b>{completed}</b><small>done</small></div>
        </div>
      </div>

      <div className="freshRoutesLayout">
        <aside className="freshRoutesList">
          <header>
            <div>
              <b>Run order</b>
              <span>Drag-free preview controls</span>
            </div>
            <button type="button" onClick={addStop}>Add stop</button>
          </header>

          {sorted.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <i>{item.order}</i>
              <b>{item.job}</b>
              <span>{item.client}</span>
              <small>{item.window} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshRoutesReset" onClick={resetRoutes}>
            Reset route
          </button>
        </aside>

        {selected && (
          <article className="freshRoutesDetail">
            <div className="freshRoutesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.job}</h2>
                <p>{selected.client} · {selected.address}</p>
              </div>

              <div className="freshRoutesHeadActions">
                <button type="button" onClick={optimizeRoute}>Optimize</button>
                <button type="button" onClick={sendRouteToDispatch}>Push to Dispatch</button>
                <button type="button" onClick={sendSelectedToCommand}>Send to Command</button>
              </div>
            </div>

            <div className="freshRoutesForm">
              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateRoute(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateRoute(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Address</span>
                <input value={selected.address} onChange={(event) => updateRoute(selected.id, { address: event.target.value })} />
              </label>

              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateRoute(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Window</span>
                <input value={selected.window} onChange={(event) => updateRoute(selected.id, { window: event.target.value })} />
              </label>

              <label>
                <span>Duration</span>
                <input value={selected.duration} onChange={(event) => updateRoute(selected.id, { duration: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateRoute(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>On route</option>
                  <option>Blocked</option>
                  <option>Completed</option>
                  <option>Skipped</option>
                </select>
              </label>

              <label className="wide">
                <span>Risk / access note</span>
                <textarea value={selected.risk} onChange={(event) => updateRoute(selected.id, { risk: event.target.value })} />
              </label>
            </div>

            <div className="freshRoutesActions">
              <button type="button" onClick={() => moveRoute(selected.id, -1)}>Move up</button>
              <button type="button" onClick={() => moveRoute(selected.id, 1)}>Move down</button>
              <button type="button" onClick={() => updateRoute(selected.id, { status: "On route" })}>On route</button>
              <button type="button" onClick={() => updateRoute(selected.id, { status: "Completed" })}>Complete</button>
              <button type="button" onClick={() => updateRoute(selected.id, { status: "Blocked" })}>Block</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
