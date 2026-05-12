import { useMemo, useState } from "react";
import { clientOf, titleOf, statusOf } from "../api";
import DetailDrawer from "./DetailDrawer";
import NotificationCentre from "./NotificationCentre";

const ROLES = [
  ["owner", "Owner"],
  ["manager", "Manager"],
  ["office_admin", "Office Admin"],
  ["worker", "Worker"],
  ["payroll", "Payroll"],
];

export default function TopCommandBar({ role, setRole, data, onNav, onCreate }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeRole = ROLES.find(([value]) => value === role)?.[1] || "Owner";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return [
      ...(data?.jobs || []).map((item) => ({ type: "Job", nav: "jobs", item })),
      ...(data?.clients || []).map((item) => ({ type: "Client", nav: "clients", item })),
      ...(data?.invoices || []).map((item) => ({ type: "Invoice", nav: "invoices", item })),
      ...(data?.quotes || []).map((item) => ({ type: "Quote", nav: "quotes", item })),
      ...(data?.workers || []).map((item) => ({ type: "Worker", nav: "crew", item })),
    ]
      .filter((row) =>
        [
          titleOf(row.item, ""),
          clientOf(row.item),
          statusOf(row.item, ""),
          row.item?.email,
          row.item?.phone,
          row.item?.address,
          row.item?.site_address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 10);
  }, [data, query]);

  function chooseCreate(type) {
    setCreateOpen(false);
    onCreate?.(type);
  }

  return (
    <>
      {roleOpen ? (
        <button
          type="button"
          className="op-click-away"
          aria-label="Close menu"
          onClick={() => setRoleOpen(false)}
        />
      ) : null}

      <div className="op-topbar">
        <span>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Owner.</span>

        <div className="op-topbar-right">
          <button type="button" onClick={() => setSearchOpen(true)}>Search</button>
          <button type="button" className="primary" onClick={() => setCreateOpen(true)}>+ Create</button>
          <NotificationCentre data={data} onNav={onNav} />
          <button type="button" onClick={() => onNav?.("queue")}>AI Queue</button>
          <button type="button" onClick={() => onNav?.("system")}>System Centre</button>

          <div className="op-role-switch">
            <button type="button" onClick={() => setRoleOpen((open) => !open)}>
              {activeRole} <span>⌄</span>
            </button>

            {roleOpen ? (
              <div className="op-role-menu">
                {ROLES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={value === role ? "active" : ""}
                    onClick={() => {
                      setRole?.(value);
                      setRoleOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DetailDrawer
        open={searchOpen}
        title="Search Churvox"
        eyebrow="GLOBAL SEARCH"
        onClose={() => setSearchOpen(false)}
      >
        <form className="op-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Search jobs, clients, invoices, quotes and workers</span>
            <input
              autoFocus
              value={query}
              placeholder="Type client, job, invoice, address or worker"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </form>

        <section className="op-list compact">
          {!query.trim() ? (
            <p className="op-muted">Start typing to search across Churvox.</p>
          ) : !results.length ? (
            <p className="op-muted">No matching records found.</p>
          ) : (
            results.map((row, index) => (
              <button
                key={`${row.type}-${index}`}
                className="op-row"
                onClick={() => {
                  onNav?.(row.nav);
                  setSearchOpen(false);
                }}
              >
                <div>
                  <strong>{titleOf(row.item, row.type)}</strong>
                  <small>{row.type} · {clientOf(row.item)} · {statusOf(row.item)}</small>
                </div>
              </button>
            ))
          )}
        </section>
      </DetailDrawer>

      <DetailDrawer
        open={createOpen}
        title="Create new"
        eyebrow="GLOBAL CREATE"
        onClose={() => setCreateOpen(false)}
      >
        <section className="op-create-grid">
          <button onClick={() => chooseCreate("jobs")}>Job</button>
          <button onClick={() => chooseCreate("clients")}>Client</button>
          <button onClick={() => chooseCreate("quotes")}>Quote</button>
          <button onClick={() => chooseCreate("invoices")}>Invoice</button>
          <button onClick={() => chooseCreate("workers")}>Worker</button>
        </section>
      </DetailDrawer>
    </>
  );
}
