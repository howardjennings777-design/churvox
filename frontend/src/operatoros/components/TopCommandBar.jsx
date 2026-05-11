import { useMemo, useState } from "react";
import { clientOf, titleOf, statusOf } from "../api";
import DetailDrawer from "./DetailDrawer";
import NotificationCentre from "./NotificationCentre";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "office_admin", label: "Office Admin" },
  { value: "worker", label: "Worker" },
  { value: "payroll", label: "Payroll" },
];

export default function TopCommandBar({ role, setRole, data, onNav, onCreate }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeRole = ROLE_OPTIONS.find((item) => item.value === role) || ROLE_OPTIONS[0];

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

  function chooseRole(nextRole) {
    setRole?.(nextRole);
    setRoleOpen(false);
  }

  return (
    <>
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
              {activeRole.label}
              <span>⌄</span>
            </button>

            {roleOpen ? (
              <div className="op-role-menu">
                {ROLE_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={item.value === role ? "active" : ""}
                    onClick={() => chooseRole(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {roleOpen ? <button className="op-click-away" aria-label="Close role menu" onClick={() => setRoleOpen(false)} /> : null}

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
              placeholder="Type a client, job, invoice, address or worker"
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
