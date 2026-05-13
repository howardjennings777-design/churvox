import { useMemo, useState } from "react";
import { apiFetch, clientOf, idOf, moneyOf, statusOf, titleOf } from "../api";
import DetailDrawer from "./DetailDrawer";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";

const ACTIONS_BY_TYPE = {
  job: [
    ["assigned", "Mark assigned"],
    ["in_progress", "Mark in progress"],
    ["completed", "Mark completed"],
  ],
  quote: [
    ["sent", "Mark sent"],
    ["accepted", "Mark accepted"],
    ["declined", "Mark declined"],
  ],
  invoice: [
    ["sent", "Mark sent"],
    ["paid", "Mark paid"],
    ["cancelled", "Cancel"],
  ],
  client: [],
};

const ENDPOINT_BY_TYPE = {
  job: "/jobs",
  client: "/clients",
  quote: "/quotes",
  invoice: "/invoices",
};

function dateOf(item) {
  const raw =
    item?.scheduled_at ||
    item?.scheduled_date ||
    item?.due_date ||
    item?.created_at ||
    item?.updated_at ||
    "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function cleanId(item) {
  return String(idOf(item) || item?.id || item?._id || "").trim();
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function visibleFields(item, type) {
  if (!item) return [];

  const common = [
    ["Client", clientOf(item)],
    ["Status", statusOf(item)],
    ["Date", dateOf(item)],
    ["Value", moneyOf(item)],
    ["Address", item.address || item.site_address || item.job_address],
    ["Email", item.email || item.customer_email || item.client_email],
    ["Phone", item.phone || item.mobile || item.client_phone],
    ["Notes", item.notes || item.description || item.job_description],
  ];

  if (type === "job") {
    common.push(
      ["Worker", item.assigned_worker_name || item.worker_name || item.assigned_to],
      ["Service", item.service_type || item.job_type],
      ["Pricing", item.pricing_type],
      ["Fixed price", item.job_price || item.price],
      ["Hourly rate", item.hourly_rate]
    );
  }

  if (type === "invoice") {
    common.push(
      ["Invoice number", item.invoice_number || item.number],
      ["Due date", item.due_date],
      ["Balance", item.balance_due || item.balance]
    );
  }

  if (type === "quote") {
    common.push(
      ["Quote number", item.quote_number || item.number],
      ["Valid until", item.valid_until],
      ["Description", item.description || item.job_description]
    );
  }

  return common.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—");
}

async function tryRecordRequest(endpoint, id, options) {
  const cleanEndpoint = String(endpoint || "").replace(/\/+$/, "");
  const cleanRecordId = encodeURIComponent(String(id || ""));

  if (!cleanEndpoint || !cleanRecordId) {
    throw new Error("Missing record id.");
  }

  const paths = [
    `${cleanEndpoint}/${cleanRecordId}`,
    `${cleanEndpoint}/id/${cleanRecordId}`,
  ];

  const requestedMethod = String(options?.method || "GET").toUpperCase();
  const methods =
    requestedMethod === "PATCH"
      ? ["PATCH", "PUT"]
      : requestedMethod === "PUT"
      ? ["PUT", "PATCH"]
      : [requestedMethod];

  let lastError = null;

  for (const method of methods) {
    for (const path of paths) {
      try {
        return await apiFetch(path, { ...options, method });
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error("Request failed.");
}

export default function WorkspaceList({
  title,
  eyebrow,
  description,
  items = [],
  type = "record",
  endpoint,
  createType,
  onCreate,
  reload,
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const endpointBase = endpoint || ENDPOINT_BY_TYPE[type] || "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      [
        titleOf(item, ""),
        clientOf(item),
        statusOf(item, ""),
        item?.email,
        item?.phone,
        item?.address,
        item?.site_address,
        item?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  async function refresh() {
    setNotice("");
    if (typeof reload === "function") {
      await reload();
    }
  }

  async function updateStatus(nextStatus) {
    const id = cleanId(selected);
    if (!id || !endpointBase || busy) return;

    setBusy(`status:${nextStatus}`);
    setNotice("");

    try {
      await tryRecordRequest(endpointBase, id, {
        method: "PATCH",
        body: {
          status: nextStatus,
          job_status: nextStatus,
          quote_status: nextStatus,
          payment_status: nextStatus,
        },
      });

      setNotice(`Status updated to ${nextStatus.replaceAll("_", " ")}.`);
      setSelected((current) => ({ ...(current || {}), status: nextStatus }));
      await refresh();
    } catch (error) {
      setNotice(error.message || "Could not update status.");
    } finally {
      setBusy("");
    }
  }

  async function deleteRecord() {
    const id = cleanId(selected);
    if (!id || !endpointBase || busy) return;

    const ok = window.confirm(`Delete ${titleOf(selected, type)}? This cannot be undone.`);
    if (!ok) return;

    setBusy("delete");
    setNotice("");

    try {
      await tryRecordRequest(endpointBase, id, { method: "DELETE" });
      setNotice(`${titleOf(selected, "Record")} deleted.`);
      setSelected(null);
      await refresh();
    } catch (error) {
      setNotice(error.message || "Could not delete record.");
    } finally {
      setBusy("");
    }
  }

  const actions = ACTIONS_BY_TYPE[type] || [];

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>

        <div className="op-head-actions">
          {onCreate && createType ? (
            <button type="button" className="primary" onClick={() => onCreate(createType)}>
              Create {type}
            </button>
          ) : null}
          <button type="button" onClick={refresh}>Refresh</button>
        </div>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}

      <section className="op-toolbar">
        <input
          value={query}
          placeholder={`Search ${title.toLowerCase()}`}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>{filtered.length} shown</span>
      </section>

      <section className="op-list">
        {!filtered.length ? (
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            body="Add or import records and Churvox will start preparing work."
          />
        ) : (
          filtered.map((item, index) => (
            <button
              key={idOf(item) || `${type}-${index}`}
              className="op-row"
              onClick={() => setSelected(item)}
            >
              <div>
                <strong>{titleOf(item, `${type} ${index + 1}`)}</strong>
                <small>
                  {[clientOf(item), item?.address || item?.site_address, dateOf(item), moneyOf(item)]
                    .filter((v) => v && v !== "—" && v !== "No client set" && v !== "No date")
                    .join(" · ") || "Open record"}
                </small>
              </div>
              <StatusBadge value={statusOf(item)} />
            </button>
          ))
        )}
      </section>

      <DetailDrawer
        open={!!selected}
        title={titleOf(selected, "Record detail")}
        eyebrow={type.toUpperCase()}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} disabled={Boolean(busy)}>
                Close
              </button>
              {actions.map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateStatus(status)}
                  disabled={Boolean(busy)}
                >
                  {busy === `status:${status}` ? "Saving..." : label}
                </button>
              ))}
              {endpointBase ? (
                <button type="button" className="danger" onClick={deleteRecord} disabled={Boolean(busy)}>
                  {busy === "delete" ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        <div className="op-detail-grid">
          {visibleFields(selected, type).slice(0, 10).map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{displayValue(value)}</b>
            </div>
          ))}
        </div>

        <section className="op-note">
          <strong>AI Operator note</strong>
          <p>
            Details stay in this drawer so the owner keeps context. Use the actions below to update this record without leaving the workspace.
          </p>
        </section>
      </DetailDrawer>
    </main>
  );
}
