import React from "react";
import { useApi } from "../hooks/useApi";

function listFrom(value, keys = []) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ["notifications", "items", "results", "records", "jobs", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value._id || value.$oid || value.oid || value.job_id || value.notification_id || "");
}

function firstText(value, keys) {
  for (const key of keys) {
    const found = value?.[key];
    if (found !== undefined && found !== null && String(found).trim()) return String(found).trim();
  }
  return "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function usefulText(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (/^(none|null|undefined|n\/a|no notes?|no message)$/i.test(text)) return "";
  return text;
}

function dateValue(value) {
  return value?.created_at || value?.createdAt || value?.updated_at || value?.updatedAt || value?.completed_at || value?.scheduled_date || "";
}

function timeLabel(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isUnread(item) {
  return item?.read !== true && item?.is_read !== true && item?.read_at == null;
}

function isMessageNotification(item) {
  const haystack = [
    item?.type,
    item?.event_type,
    item?.title,
    item?.subject,
    item?.message,
    item?.body,
    item?.text,
    item?.description,
  ].map((part) => String(part || "").toLowerCase()).join(" ");

  return /message|contact office|worker note|worker update|sent back|needs fix|reply/.test(haystack);
}

function routeToMessages() {
  try {
    window.location.href = "/dashboard#messages";
  } catch {}
}

function jobIdOf(value) {
  return String(value?.job_id || value?.jobId || value?.job?.id || value?.job?._id || value?.linked_job_id || value?.linkedJobId || idOf(value?.job) || "");
}

function workerNameOf(value) {
  return firstText(value, [
    "worker_name",
    "workerName",
    "assigned_worker_name",
    "assignedWorkerName",
    "staff_name",
    "from",
    "created_by_name",
    "user_name",
    "name",
  ]) || "Worker";
}

function jobTitleOf(value) {
  return firstText(value, ["job_title", "jobTitle", "title", "name", "service_name"]) || "Job message";
}

function notificationMessage(item, index) {
  const text = usefulText(firstText(item, ["message", "body", "text", "description"]) || firstText(item, ["title", "subject"]));
  if (!text || !isMessageNotification(item)) return null;

  const notificationId = idOf(item) || `notification-${index}`;
  const jobId = jobIdOf(item);
  const workerName = workerNameOf(item);
  const createdAt = dateValue(item) || new Date().toISOString();

  return {
    threadKey: jobId ? `job:${jobId}` : `notification:${notificationId}`,
    notificationId,
    jobId,
    jobTitle: jobTitleOf(item),
    workerName,
    unread: isUnread(item),
    message: {
      id: `notification-${notificationId}`,
      direction: "from_worker",
      label: "Worker message",
      text,
      at: createdAt,
      source: "Notification",
      unread: isUnread(item),
    },
  };
}

const JOB_MESSAGE_FIELDS = [
  ["worker_notes", "from_worker", "Worker note"],
  ["worker_note", "from_worker", "Worker note"],
  ["message_to_boss", "from_worker", "Message to owner"],
  ["worker_message", "from_worker", "Worker message"],
  ["completion_message", "from_worker", "Completion message"],
  ["completion_notes", "from_worker", "Completion notes"],
  ["field_notes", "from_worker", "Field note"],
  ["contact_office_message", "from_worker", "Contact office"],
  ["office_message", "from_worker", "Contact office"],
  ["owner_note", "to_worker", "Owner reply"],
  ["boss_note", "to_worker", "Owner reply"],
  ["send_back_note", "to_worker", "Sent back"],
];

function jobMessages(job, index) {
  const jobId = jobIdOf(job) || idOf(job) || `job-${index}`;
  const jobTitle = jobTitleOf(job);
  const workerName = workerNameOf(job);
  const baseTime = dateValue(job) || new Date().toISOString();
  const seen = new Set();
  const messages = [];

  JOB_MESSAGE_FIELDS.forEach(([field, direction, label]) => {
    const text = usefulText(job?.[field]);
    const key = `${direction}:${cleanText(text).toLowerCase()}`;
    if (!text || seen.has(key)) return;
    seen.add(key);
    messages.push({
      id: `${jobId}-${field}`,
      direction,
      label,
      text,
      at: baseTime,
      source: "Job record",
      unread: false,
    });
  });

  if (!messages.length) return null;
  return {
    threadKey: `job:${jobId}`,
    notificationId: "",
    jobId,
    jobTitle,
    workerName,
    unread: false,
    messages,
  };
}

function mergeThreads(notificationRows, jobRows) {
  const map = new Map();

  function ensure(row) {
    const key = row.threadKey;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        jobId: row.jobId || "",
        jobTitle: row.jobTitle || "Job message",
        workerName: row.workerName || "Worker",
        unread: false,
        notificationIds: [],
        messages: [],
      });
    }

    const thread = map.get(key);
    if (row.jobId && !thread.jobId) thread.jobId = row.jobId;
    if (row.jobTitle && thread.jobTitle === "Job message") thread.jobTitle = row.jobTitle;
    if (row.workerName && thread.workerName === "Worker") thread.workerName = row.workerName;
    if (row.notificationId) thread.notificationIds.push(row.notificationId);
    thread.unread = thread.unread || Boolean(row.unread);

    const incoming = row.messages || (row.message ? [row.message] : []);
    incoming.forEach((message) => {
      const messageKey = `${message.direction}:${cleanText(message.text).toLowerCase()}`;
      if (!thread.messages.some((existing) => `${existing.direction}:${cleanText(existing.text).toLowerCase()}` === messageKey)) {
        thread.messages.push(message);
      }
    });
  }

  notificationRows.filter(Boolean).forEach(ensure);
  jobRows.filter(Boolean).forEach(ensure);

  return Array.from(map.values())
    .map((thread) => ({
      ...thread,
      messages: thread.messages.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0)),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.messages.at(-1)?.at || 0).getTime();
      const bTime = new Date(b.messages.at(-1)?.at || 0).getTime();
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return bTime - aTime;
    });
}

export default function FreshMessages({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [threads, setThreads] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [drafts, setDrafts] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");

  const selected = threads.find((thread) => thread.id === selectedId) || threads[0] || null;
  const selectedDraft = selected ? drafts[selected.id] || "" : "";
  const unread = threads.filter((thread) => thread.unread).length;
  const needsReply = threads.filter((thread) => thread.messages.at(-1)?.direction === "from_worker").length;
  const jobLinked = threads.filter((thread) => thread.jobId).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const [notificationRes, jobsRes] = await Promise.all([
        get(`/notifications?limit=80&ts=${Date.now()}`),
        get(`/jobs?limit=120&ts=${Date.now()}`),
      ]);

      const notifications = notificationRes?.success ? listFrom(notificationRes.data, ["notifications"]) : [];
      const jobs = jobsRes?.success ? listFrom(jobsRes.data, ["jobs"]) : [];
      const next = mergeThreads(
        notifications.map(notificationMessage),
        jobs.map(jobMessages),
      );

      setThreads(next);
      setSelectedId((current) => next.some((thread) => thread.id === current) ? current : next[0]?.id || "");
      if (!next.length) setStatus("No worker messages found in live notifications or job records yet.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    load();
  }, [load]);

  function updateDraft(value) {
    if (!selected) return;
    setDrafts((current) => ({ ...current, [selected.id]: value }));
  }

  async function markSelectedRead() {
    if (!selected) return;
    setThreads((current) => current.map((thread) => thread.id === selected.id ? { ...thread, unread: false } : thread));
    await Promise.all(selected.notificationIds.map((id) => patch(`/notifications/${encodeURIComponent(id)}/read`, {}).catch(() => null)));
    setStatus("Marked as read.");
  }

  function openLinkedJob() {
    if (selected?.jobId) {
      try { window.localStorage.setItem("churvox:fresh-open-job-id:v1", selected.jobId); } catch {}
    }
    if (onNavigate) onNavigate("jobs");
    else window.location.href = "/dashboard#jobs";
  }

  async function sendReply() {
    if (!selected) return;
    const note = selectedDraft.trim();
    if (!note) {
      setStatus("Write the owner reply first.");
      return;
    }
    if (!selected.jobId) {
      setStatus("This message has no linked job id, so Churvox cannot send a worker reply from here.");
      return;
    }

    const payload = {
      owner_note: note,
      boss_note: note,
      send_back_note: note,
      work_review_status: "sent_back",
      review_status: "sent_back",
      owner_review_status: "sent_back",
      worker_action_required: true,
      status: "assigned",
    };

    const endpoints = [
      `/worker/jobs/${encodeURIComponent(selected.jobId)}/send-back`,
      `/jobs/${encodeURIComponent(selected.jobId)}/send-back`,
    ];

    setLoading(true);
    try {
      for (const endpoint of endpoints) {
        const res = await post(endpoint, payload);
        if (res?.success && res.data?.success !== false) {
          setDrafts((current) => ({ ...current, [selected.id]: "" }));
          setStatus("Reply sent back to the worker.");
          await markSelectedRead();
          await load();
          return;
        }
      }
      setStatus("Reply could not be sent. Open the linked job and try from the job review controls.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="freshMessagesPage">
      <div className="freshMessagesHero">
        <div>
          <span>Owner inbox</span>
          <h1>Messages</h1>
          <p>Worker messages, job notes, and send-back replies are kept here so Jobs, Clients, Quotes, and Invoices stay as clean records.</p>
        </div>

        <div className="freshMessagesStats">
          <div><b>{threads.length}</b><small>threads</small></div>
          <div><b>{unread}</b><small>unread</small></div>
          <div><b>{needsReply}</b><small>need reply</small></div>
          <div><b>{jobLinked}</b><small>linked jobs</small></div>
        </div>
      </div>

      <div className="freshMessagesLayout">
        <aside className="freshMessagesList">
          <header>
            <div>
              <b>Worker board</b>
              <span>{loading ? "Refreshing live messages" : "Live from notifications and jobs"}</span>
            </div>
            <button type="button" onClick={load} disabled={loading}>{loading ? "Wait" : "Refresh"}</button>
          </header>

          {!loading && !threads.length ? (
            <article className="freshMessagesEmpty">
              <b>No messages found</b>
              <span>When a worker contacts the office or leaves completion notes, the thread will appear here.</span>
            </article>
          ) : null}

          {threads.map((thread) => {
            const last = thread.messages.at(-1);
            return (
              <button
                type="button"
                key={thread.id}
                className={`${selected?.id === thread.id ? "active" : ""} ${thread.unread ? "unread" : ""}`}
                onClick={() => setSelectedId(thread.id)}
              >
                <b>{thread.workerName}</b>
                <span>{thread.jobTitle}</span>
                <small>{thread.unread ? "Unread" : "Open"} - {last?.label || "Message"}{last?.at ? ` - ${timeLabel(last.at)}` : ""}</small>
              </button>
            );
          })}
        </aside>

        {selected ? (
          <article className="freshMessagesDetail">
            <div className="freshMessagesHead">
              <div>
                <span>{selected.unread ? "Needs attention" : "Thread"}</span>
                <h2>{selected.workerName}</h2>
                <p>{selected.jobTitle}{selected.jobId ? ` - job ${selected.jobId}` : " - no linked job id"}</p>
              </div>

              <div className="freshMessagesHeadActions">
                <button type="button" onClick={sendReply} disabled={loading || !selectedDraft.trim()}>Send reply</button>
                <button type="button" onClick={openLinkedJob}>Open job</button>
              </div>
            </div>

            <div className="freshMessagesConversation freshMessagesMessageList">
              <section>
                <span>Thread</span>
                <div className="freshMessagesBubbles">
                  {selected.messages.map((message) => (
                    <article key={message.id} className={message.direction === "to_worker" ? "outbound" : "inbound"}>
                      <b>{message.label}</b>
                      <p>{message.text}</p>
                      <small>{message.source}{message.at ? ` - ${timeLabel(message.at)}` : ""}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <span>Owner reply</span>
                <p>Use this when the worker needs a fix, answer, or clarification. It sends back on the linked job.</p>
                <textarea
                  value={selectedDraft}
                  onChange={(event) => updateDraft(event.target.value)}
                  placeholder="Write the reply for the worker..."
                />
              </section>
            </div>

            {status ? <p className="freshMessagesStatus">{status}</p> : null}

            <div className="freshMessagesActions">
              <button type="button" onClick={sendReply} disabled={loading || !selectedDraft.trim()}>Send reply to worker</button>
              <button type="button" onClick={markSelectedRead}>Mark read</button>
              <button type="button" onClick={openLinkedJob}>Open linked job</button>
              <button type="button" onClick={routeToMessages}>Copy messages link</button>
            </div>
          </article>
        ) : (
          <article className="freshMessagesDetail freshMessagesEmptyDetail">
            <b>Messages board</b>
            <span>{status || "Loading live worker messages..."}</span>
          </article>
        )}
      </div>
    </section>
  );
}
