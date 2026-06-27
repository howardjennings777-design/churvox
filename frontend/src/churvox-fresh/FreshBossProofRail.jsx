import React from "react";

const PROOF_TRAIL_KEY = "churvox:proof-trail:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function readList(key) {
  try {
    if (typeof window === "undefined") return [];
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, items) {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    return true;
  } catch {
    return false;
  }
}

function timeText(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function titleFor(item) {
  return item?.title || item?.job_title || "Worker update";
}

function summaryFor(item) {
  return item?.summary || [item?.customer, item?.address].filter(Boolean).join(" - ") || "Worker proof update.";
}

function labelFor(type) {
  const text = String(type || "update").toLowerCase();
  if (text.includes("arrived")) return "Arrived";
  if (text.includes("completed")) return "Complete";
  if (text.includes("blocked")) return "Blocked";
  if (text.includes("material")) return "Material";
  if (text.includes("acknowledged")) return "Ack";
  return "Update";
}

function commandItemFromProof(item) {
  return {
    id: `worker-proof-review-${item?.id || Date.now()}`,
    source: "worker-proof-rail",
    category: labelFor(item?.type),
    action: item?.type === "blocked" ? "Prepare owner decision" : "Review worker proof",
    title: titleFor(item),
    summary: summaryFor(item),
    found: item?.summary || `${titleFor(item)} has a worker update.`,
    prepared: item?.type === "blocked"
      ? "Prepare the owner decision: fix now, contact customer, reassign, or park."
      : "Review the worker update and approve the next admin step.",
    why: "Worker activity is now ready for owner review.",
    details: {
      customer_name: item?.customer || "",
      job_title: titleFor(item),
      address: item?.address || "",
      worker_note: item?.note || item?.summary || "",
      event_type: item?.type || "update",
      at: item?.at || new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };
}

export default function FreshBossProofRail({ onNavigate }) {
  const [items, setItems] = React.useState(() => readList(PROOF_TRAIL_KEY));
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(() => {
    try {
      return window.localStorage.getItem("churvox:boss-proof-rail-open") !== "false";
    } catch {
      return true;
    }
  });

  const refresh = React.useCallback(() => setItems(readList(PROOF_TRAIL_KEY)), []);

  React.useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("churvox:fresh-data-updated", refresh);
    };
  }, [refresh]);

  const recent = React.useMemo(() => {
    return [...items]
      .sort((a, b) => String(b?.at || "").localeCompare(String(a?.at || "")))
      .slice(0, 5);
  }, [items]);

  if (!recent.length) return null;

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem("churvox:boss-proof-rail-open", String(next));
    } catch {}
  }

  function sendLatestToCommand() {
    const latest = recent[0];
    const current = readList(COMMAND_INBOX_KEY);
    const next = [commandItemFromProof(latest), ...current].slice(0, 50);
    const saved = writeList(COMMAND_INBOX_KEY, next);
    setMessage(saved ? "Latest proof sent to Command." : "Could not send proof to Command.");
    if (saved) onNavigate?.("command");
  }

  return (
    <aside className={`freshBossProofRail ${open ? "open" : "closed"}`} aria-label="Boss worker proof rail">
      <header>
        <div>
          <span>Worker proof</span>
          <b>{recent.length}</b>
        </div>
        <button type="button" onClick={toggleOpen}>{open ? "Hide" : "Show"}</button>
      </header>

      {open ? (
        <>
          <div className="freshBossProofRailList">
            {recent.map((item, index) => (
              <button key={item?.id || `${item?.type}-${index}`} type="button" onClick={() => onNavigate?.("workercommand")}>
                <span>{labelFor(item?.type)} - {timeText(item?.at)}</span>
                <b>{titleFor(item)}</b>
                <small>{summaryFor(item)}</small>
              </button>
            ))}
          </div>
          {message ? <p>{message}</p> : null}
          <footer>
            <button type="button" onClick={sendLatestToCommand}>Send latest to Command</button>
            <button type="button" onClick={() => onNavigate?.("workercommand")}>Open workers</button>
          </footer>
        </>
      ) : null}
    </aside>
  );
}
