import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshDispatchPolish.css";

const lanes = ["Unconfirmed", "Ready", "On site", "Complete", "Blocked"];

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  return [];
}

function statusLabel(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/complete|done|finished/.test(text)) return "Complete";
  if (/site|started|progress|active/.test(text)) return "On site";
  if (/block|hold|issue|missing|cancel/.test(text)) return "Blocked";
  if (/unconfirm|draft|pending|acknowledge/.test(text)) return "Unconfirmed";
  return "Ready";
}

function scheduleText(job) {
  const raw = job?.scheduled_date || job?.scheduled_at || job?.date || "";
  if (!raw) return "Not scheduled";
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return String(raw);
  return new Date(parsed).toLocaleString("en-NZ", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeJob(job, index) {
  const id = normalizeId(job?.id || job?._id || job?.job_id) || `job-${index}`;
  return {
    ...job,
    id,
    job: job?.title || job?.job_name || job?.name || `Job ${index + 1}`,
    client: job?.client_name || job?.customer_name || job?.client || job?.customer || "No client linked",
    worker: job?.assigned_worker_name || job?.worker_name || job?.worker || "Unassigned",
    status: statusLabel(job?.status),
    time: scheduleText(job),
    address: job?.address || job?.site_address || job?.service_address || "No address",
    access: job?.access || job?.access_instructions || "No access instructions yet",
    notes: job?.dispatch_notes || job?.notes || job?.description || "No dispatch notes yet",
  };
}

function backendStatus(label) {
  if (label === "Complete") return "completed";
  if (label === "On site") return "in_progress";
  if (label === "Blocked") return "blocked";
  if (label === "Unconfirmed") return "assigned";
  return "ready";
}

export default function FreshDispatch({ onNavigate }) {
  const { get, patch } = useApi();
  const [items, setItems] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const selected = items.find((item) => item.id === selectedId) || items[0];

  const loadDispatch = React.useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await get("/jobs", { timeout: 25000 });
    setLoading(false);

    if (!res?.success) {
      setItems([]);
      setSelectedId("");
      setError(res?.error || "Could not load real jobs.");
      return;
    }

    const next = unpackList(res.data).map(normalizeJob);
    setItems(next);
    setSelectedId((current) => next.some((item) => item.id === current) ? current : next[0]?.id || "");
  }, [get]);

  React.useEffect(() => {
    loadDispatch();
  }, [loadDispatch]);

  React.useEffect(() => {
    const reload = () => loadDispatch();
    window.addEventListener("churvox:fresh-data-updated", reload);
    return () => window.removeEventListener("churvox:fresh-data-updated", reload);
  }, [loadDispatch]);

  async function updateSelectedDispatch(nextPatch) {
    if (!selected) return;

    const nextLocal = { ...selected, ...nextPatch };
    setItems((current) => current.map((item) => item.id === selected.id ? nextLocal : item));

    const backendPatch = {};
    if (nextPatch.status) backendPatch.status = backendStatus(nextPatch.status);
    if (nextPatch.address !== undefined) backendPatch.address = nextPatch.address;
    if (nextPatch.access !== undefined) backendPatch.access_instructions = nextPatch.access;
    if (nextPatch.notes !== undefined) backendPatch.dispatch_notes = nextPatch.notes;

    if (Object.keys(backendPatch).length) {
      const res = await patch(`/jobs/${selected.id}`, backendPatch, { timeout: 25000 });
      if (!res?.success) {
        setError(res?.error || "Could not update job.");
        loadDispatch();
      }
    }
  }

  const ready = items.filter((item) => item.status === "Ready").length;
  const onSite = items.filter((item) => item.status === "On site").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;

  return (
    <section className="freshDispatchPage">
      <header className="freshHero freshDispatchHero">
        <span>Churvox fresh · Schedule</span>
        <h1>Schedule</h1>
        <p>Plan the day, confirm routes, move risky work out of the way and keep jobs flowing.</p>
      </header>

      <section className="freshDispatchStats">
        <aside className="freshCard"><h2>{loading ? "…" : ready}</h2><p>Ready</p></aside>
        <aside className="freshCard"><h2>{loading ? "…" : onSite}</h2><p>On site</p></aside>
        <aside className="freshCard"><h2>{loading ? "…" : blocked}</h2><p>Blocked</p></aside>
      </section>

      {error ? (
        <section className="freshCard freshItem need">
          <b>Schedule needs attention</b>
          <span>{error}</span>
          <button className="freshPrimary" type="button" onClick={loadDispatch}>Retry</button>
        </section>
      ) : null}

      <section className="freshDispatchWorkspace">
        <aside className="freshCard freshDispatchListCard">
          <h2>Today’s work</h2>

          <div className="freshDispatchLaneTabs">
            {lanes.map((lane) => (
              <button
                key={lane}
                type="button"
                className={selected?.status === lane ? "active" : ""}
                onClick={() => {
                  const found = items.find((item) => item.status === lane);
                  if (found) setSelectedId(found.id);
                }}
              >
                <span>{lane}</span>
                <b>{items.filter((item) => item.status === lane).length}</b>
              </button>
            ))}
          </div>

          <div className="freshDispatchJobList">
            {loading && !items.length ? (
              <div className="freshItem"><b>Loading real jobs…</b><span>Checking your business account.</span></div>
            ) : items.length ? items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`freshDispatchJob ${selected?.id === item.id ? "active" : ""} ${item.status === "Blocked" ? "need" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <b>{item.job}</b>
                <span>{item.client} · {item.status}</span>
                <small>{item.time} · {item.worker}</small>
              </button>
            )) : (
              <div className="freshItem">
                <b>No jobs to schedule yet</b>
                <span>Create jobs first, then they will appear here.</span>
              </div>
            )}
          </div>
        </aside>

        <section className="freshCard freshDispatchDetailCard">
          <h2>{selected?.job || "Select work"}</h2>

          {selected ? (
            <>
              <div className="freshMiniGrid">
                <div><span>Client</span><b>{selected.client}</b></div>
                <div><span>Status</span><b>{selected.status}</b></div>
                <div><span>Worker</span><b>{selected.worker}</b></div>
                <div><span>Time</span><b>{selected.time}</b></div>
              </div>

              <label className="freshField">
                <span>Address</span>
                <input value={selected.address} onChange={(event) => updateSelectedDispatch({ address: event.target.value })} />
              </label>

              <label className="freshField">
                <span>Access instructions</span>
                <textarea value={selected.access} onChange={(event) => updateSelectedDispatch({ access: event.target.value })} />
              </label>

              <label className="freshField">
                <span>Dispatch notes</span>
                <textarea value={selected.notes} onChange={(event) => updateSelectedDispatch({ notes: event.target.value })} />
              </label>
            </>
          ) : (
            <div className="freshItem">
              <b>No work selected</b>
              <span>Select a job from the list.</span>
            </div>
          )}
        </section>

        <aside className="freshCard freshDispatchActionsCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => updateSelectedDispatch({ status: "Ready" })}>Confirm route</button>
            <button className="freshOrange" type="button" onClick={() => updateSelectedDispatch({ status: "On site" })}>Mark on site</button>
            <button className="freshDark" type="button" onClick={() => updateSelectedDispatch({ status: "Complete" })}>Mark complete</button>
            <button className="freshGhost" type="button" onClick={() => updateSelectedDispatch({ status: "Blocked" })}>Block job</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("team")}>Reassign worker</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send issue to Review</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
