import { useMemo, useState } from "react";
import { clientOf, idOf, moneyOf, statusOf, titleOf } from "../api";
import DetailDrawer from "./DetailDrawer";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";

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

export default function WorkspaceList({
  title,
  eyebrow,
  description,
  items = [],
  type = "record",
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

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

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </section>

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
      >
        <div className="op-detail-grid">
          <div>
            <small>Status</small>
            <b>{statusOf(selected)}</b>
          </div>
          <div>
            <small>Client</small>
            <b>{clientOf(selected)}</b>
          </div>
          <div>
            <small>Date</small>
            <b>{dateOf(selected)}</b>
          </div>
          <div>
            <small>Value</small>
            <b>{moneyOf(selected)}</b>
          </div>
        </div>

        <section className="op-note">
          <strong>AI Operator note</strong>
          <p>
            Details stay in this drawer so the owner keeps context. This stops
            the app jumping all over the place.
          </p>
        </section>
      </DetailDrawer>
    </main>
  );
}
