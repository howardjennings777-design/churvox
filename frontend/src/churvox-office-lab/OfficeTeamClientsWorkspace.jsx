import React, { useMemo, useState } from "react";
import "./OfficeTeamCorePageIdentity.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Client A", "Preference memory", "Save note", "A service preference may help future work."],
  ["Client B", "Rebook cycle", "No next booking", "The client normally returns on a repeat cycle."],
  ["Client C", "Invoice question", "Owner decision needed", "An extra-work question needs a clear response."],
  ["New lead", "Missing details", "Ask for address", "The contact record is incomplete."],
];

export default function OfficeTeamClientsWorkspace({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("clients", fallbackRows, { allowFallback, emptyMessage: "No clients found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [query, setQuery] = useState("");
  const rows = live.rows;
  const current = selectedRow(rows, selected, allowFallback ? fallbackRows : []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.some((part) => String(part || "").toLowerCase().includes(needle)));
  }, [query, rows]);
  const needsFollowUp = rows.filter((row) => /need|ask|missing|follow|no next|review|question/.test(String(row?.[2] || "").toLowerCase())).length;

  return (
    <section className="cvSiteScreen cvClientsWorkspace">
      <header className="cvCorePageHero cvClientsHero">
        <div>
          <span>Clients</span>
          <h2>Remember the person, not just the last job.</h2>
          <p>Client records are organised around relationship context, useful memory and the next sensible step. Sensitive or uncertain details still return to Command before a record changes.</p>
        </div>
        <div className="cvCoreHeroStats" aria-label="Client summary">
          <article><strong>{rows.length}</strong><small>Clients loaded</small></article>
          <article><strong>{needsFollowUp}</strong><small>Need a next step</small></article>
          <article><strong>{rows.length - needsFollowUp}</strong><small>Quiet records</small></article>
        </div>
      </header>

      <div className="cvClientBookLayout">
        <aside className="cvClientDirectory">
          <div className="cvClientDirectoryHead">
            <div><span>Directory</span><small>{live.label}</small></div>
            <label><span>Find a client</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, status or detail" /></label>
          </div>
          <div className="cvClientDirectoryList">
            {filtered.length ? filtered.map((row) => (
              <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
                <span className="cvClientAvatar" aria-hidden="true">{initials(row[0])}</span>
                <span><strong>{row[0]}</strong><small>{row[1]}</small></span>
                <em>{row[2]}</em>
              </button>
            )) : <Empty title={rows.length ? "No matching clients" : "No clients yet"} text={rows.length ? "Try a different search." : ownerRoute ? "Add or import the first client below." : "Client records will appear here."} />}
          </div>
        </aside>

        <section className="cvClientRelationship" aria-label="Selected client relationship">
          {rows.length ? (
            <>
              <header className="cvClientIdentity">
                <span className="cvClientAvatar large" aria-hidden="true">{initials(current[0])}</span>
                <div><span>Client relationship</span><h3>{current[0]}</h3><p>{current[1]}</p></div>
                <em>{current[2]}</em>
              </header>

              <section className="cvClientMemoryBoard">
                <article className="cvClientMemoryPrimary">
                  <span>Latest useful context</span>
                  <strong>{current[3] || "No detail found"}</strong>
                  <p>Churvox does not turn this into permanent memory until the owner approves the appropriate record change.</p>
                </article>
                <article><small>Record type or status</small><strong>{current[1] || "Not found"}</strong></article>
                <article><small>Suggested next check</small><strong>{current[2] || "Not found"}</strong></article>
                <article><small>Memory rule</small><strong>Useful, relevant and appropriate only</strong></article>
              </section>

              <section className="cvClientHistoryPath">
                <div><span>Relationship path</span><h3>What Churvox should know before the next contact</h3></div>
                <ol>
                  <li><strong>Identify</strong><small>Confirm the correct client record</small></li>
                  <li><strong>Check history</strong><small>Look for a duplicate or existing note</small></li>
                  <li><strong>Judge relevance</strong><small>Keep only information that helps future service</small></li>
                  <li><strong>Owner approves</strong><small>Save, edit, ignore or park</small></li>
                </ol>
              </section>

              <OfficeTeamSafeControls area="clients" record={current} primary="Prepare client update" secondary="Review client history" command="Prepare memory decision" />
            </>
          ) : <Empty title="No client selected" text="The relationship view will open when a client exists." />}
        </section>
      </div>

      <section className="cvCoreWorkingDock cvClientIntakeDock">
        <div><span>Client intake</span><h3>Add one person or import a list</h3><p>New clients, corrections and memory updates stay editable and owner-controlled. Imported rows remain attached to the prepared work.</p></div>
        <OfficeTeamWorkForms area="clients" title="Clients" selectedRecord={current} />
      </section>
    </section>
  );
}

function initials(value) {
  const parts = String(value || "C").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

function Empty({ title, text }) {
  return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
