import React from "react";
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Database,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { OWNER_AREAS, PRODUCT_PROMISE, RELEASE_GATES } from "./productContract";
import { loadOfficeArea, stableOwnerRoute } from "./officeOSLiveData";
import "./officeOSConnected.css";

export const OFFICE_OS_CONNECTED_BUILD = "churvox-office-os-connected-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_CONNECTED_BUILD__ = OFFICE_OS_CONNECTED_BUILD;
}

function initialArea() {
  if (typeof window === "undefined") return "today";
  const requested = new URLSearchParams(window.location.search || "").get("area");
  return OWNER_AREAS.some((area) => area.id === requested) ? requested : "today";
}

function formatWhen(value) {
  if (!value) return "Not refreshed yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Live read";
  return `Refreshed ${parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function stateCopy(state) {
  if (state === "live") return ["Live records", "good"];
  if (state === "empty") return ["Live and clear", "neutral"];
  if (state === "locked") return ["Sign-in required", "warn"];
  if (state === "loading") return ["Checking records", "neutral"];
  return ["Read unavailable", "bad"];
}

function StatePill({ state }) {
  const [label, tone] = stateCopy(state);
  return <span className={`cvoscPill ${tone}`}>{label}</span>;
}

function AreaNav({ active, onChange }) {
  return (
    <nav className="cvoscNav" aria-label="Connected Office OS areas">
      {OWNER_AREAS.map((area) => (
        <button
          type="button"
          key={area.id}
          className={active === area.id ? "active" : ""}
          onClick={() => onChange(area.id)}
        >
          <strong>{area.label}</strong>
          <span>{area.purpose}</span>
        </button>
      ))}
    </nav>
  );
}

function Metric({ label, value, note }) {
  return (
    <article className="cvoscMetric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function RecordCard({ record }) {
  return (
    <article className="cvoscRecord">
      <div className="cvoscRecordTop">
        <div>
          <small>{record.subtitle}</small>
          <h3>{record.title}</h3>
        </div>
        <span>{record.status}</span>
      </div>
      <p>{record.detail}</p>
      {record.amount ? <strong className="cvoscAmount">{record.amount}</strong> : null}
    </article>
  );
}

function EmptyState({ state, message }) {
  const Icon = state === "unavailable" || state === "locked" ? CircleAlert : CircleCheck;
  return (
    <section className="cvoscEmpty">
      <Icon size={28} />
      <h3>{state === "unavailable" ? "Live records could not be confirmed" : state === "locked" ? "Owner sign-in is required" : "Nothing waiting here"}</h3>
      <p>{message || "Churvox did not substitute sample records."}</p>
    </section>
  );
}

function StableAction({ area, label }) {
  return (
    <a className="cvoscPrimary" href={stableOwnerRoute(area)}>
      {label || `Open working ${area}`} <ArrowUpRight size={17} />
    </a>
  );
}

function TodayView({ data }) {
  const counts = data?.counts || {};
  const sections = data?.sections || {};
  const command = sections.command || { records: [], state: "empty" };
  const work = sections.work || { records: [], state: "empty" };
  const invoices = sections.invoices || { records: [], state: "empty" };
  const team = sections.team || { records: [], state: "empty" };

  return (
    <div className="cvoscGrid">
      <section className="cvoscHero cvoscSpan12">
        <div>
          <span className="cvoscEyebrow">Connected owner briefing</span>
          <h2>{counts.command ? `${counts.command} decision${counts.command === 1 ? "" : "s"} need you.` : "The owner queue is clear."}</h2>
          <p>These numbers come from the current Churvox records. This replacement screen is read-only while proven write actions remain in the working owner app.</p>
          <div className="cvoscActions">
            <StableAction area="command" label="Open working Command" />
            <StableAction area="work" label="Open working jobs" />
          </div>
        </div>
        <aside>
          <ShieldCheck size={28} />
          <small>Migration safety</small>
          <strong>No duplicate write system</strong>
          <p>The rebuild reads the real business but does not create a second path that could send, charge, sync or change records.</p>
        </aside>
      </section>

      <section className="cvoscMetrics cvoscSpan12">
        <Metric label="Owner decisions" value={String(counts.command || 0)} note="Confirmed Command slips" />
        <Metric label="Jobs visible" value={String(counts.work || 0)} note="Current live read" />
        <Metric label="Clients visible" value={String(counts.clients || 0)} note="Business-scoped records" />
        <Metric label="Invoices visible" value={String(counts.invoices || 0)} note="No payment state invented" />
        <Metric label="Team visible" value={String(counts.team || 0)} note="Role-safe owner read" />
      </section>

      <section className="cvoscPanel cvoscSpan7">
        <header><div><small>Field and office</small><h3>Current work</h3></div><StatePill state={work.state} /></header>
        <div className="cvoscRecordList">
          {work.records.slice(0, 4).map((record) => <RecordCard key={record.id} record={record} />)}
          {!work.records.length ? <EmptyState state={work.state} message={work.message} /> : null}
        </div>
      </section>

      <section className="cvoscPanel cvoscSpan5 cvoscDark">
        <header><div><small>Owner attention</small><h3>Command</h3></div><StatePill state={command.state} /></header>
        <div className="cvoscCommandList">
          {command.records.slice(0, 4).map((record) => (
            <article key={record.id}>
              <small>{record.subtitle}</small>
              <strong>{record.title}</strong>
              <p>{record.detail}</p>
            </article>
          ))}
          {!command.records.length ? <EmptyState state={command.state} message={command.message} /> : null}
        </div>
        <StableAction area="command" label="Review and decide in Command" />
      </section>

      <section className="cvoscPanel cvoscSpan6">
        <header><div><small>Money truth</small><h3>Invoices</h3></div><StatePill state={invoices.state} /></header>
        <div className="cvoscRecordList compact">
          {invoices.records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} />)}
          {!invoices.records.length ? <EmptyState state={invoices.state} message={invoices.message} /> : null}
        </div>
      </section>

      <section className="cvoscPanel cvoscSpan6">
        <header><div><small>People</small><h3>Team</h3></div><StatePill state={team.state} /></header>
        <div className="cvoscRecordList compact">
          {team.records.slice(0, 3).map((record) => <RecordCard key={record.id} record={record} />)}
          {!team.records.length ? <EmptyState state={team.state} message={team.message} /> : null}
        </div>
      </section>
    </div>
  );
}

function CommandView({ data }) {
  return (
    <section className="cvoscPage">
      <header className="cvoscPageHead">
        <div><span className="cvoscEyebrow">Single approval desk</span><h2>Command reads the confirmed owner queue.</h2><p>Decision execution remains in the proven Command workflow until this replacement passes mutation, idempotency and audit gates.</p></div>
        <StableAction area="command" label="Open working Command" />
      </header>
      <div className="cvoscCommandBoard">
        {(data?.records || []).map((record, index) => (
          <article key={record.id}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <div><small>{record.subtitle}</small><h3>{record.title}</h3><p>{record.detail}</p></div>
            <span>{record.status}</span>
          </article>
        ))}
        {!data?.records?.length ? <EmptyState state={data?.state} message={data?.message} /> : null}
      </div>
    </section>
  );
}

function RecordsView({ area, data }) {
  const active = OWNER_AREAS.find((item) => item.id === area) || OWNER_AREAS[0];
  return (
    <section className="cvoscPage">
      <header className="cvoscPageHead">
        <div><span className="cvoscEyebrow">Live read-only replacement</span><h2>{active.label}</h2><p>{active.purpose} No sample rows are used when the live endpoint is empty or unavailable.</p></div>
        <StableAction area={area} label={`Open working ${active.label}`} />
      </header>
      <div className="cvoscRecordsGrid">
        {(data?.records || []).map((record) => <RecordCard key={`${record.id}-${record.title}`} record={record} />)}
        {!data?.records?.length ? <EmptyState state={data?.state} message={data?.message} /> : null}
      </div>
    </section>
  );
}

function ReportsView({ data }) {
  const counts = data?.counts || {};
  const gates = Object.entries(RELEASE_GATES);
  return (
    <section className="cvoscPage">
      <header className="cvoscPageHead">
        <div><span className="cvoscEyebrow">Connected business truth</span><h2>Reports begin with records we can prove.</h2><p>The replacement does not manufacture revenue, margin or payment numbers. Deeper calculations stay gated until their source contracts are verified.</p></div>
        <StableAction area="reports" label="Open working reports" />
      </header>
      <div className="cvoscMetrics report">
        <Metric label="Jobs" value={String(counts.work || 0)} note="Live records returned" />
        <Metric label="Quotes" value={String(counts.quotes || 0)} note="Live records returned" />
        <Metric label="Invoices" value={String(counts.invoices || 0)} note="Live records returned" />
        <Metric label="Messages" value={String(counts.messages || 0)} note="Live records returned" />
      </div>
      <div className="cvoscGateGrid">
        {gates.map(([name, items]) => (
          <article key={name}><Database size={20} /><strong>{name}</strong><span>{items.length} required checks</span><ul>{items.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></article>
        ))}
      </div>
    </section>
  );
}

function SettingsView({ data }) {
  return (
    <section className="cvoscPage">
      <header className="cvoscPageHead">
        <div><span className="cvoscEyebrow">Rules and controls</span><h2>Business settings stay owner-controlled.</h2><p>The replacement may display current settings, but changes continue through the existing validated form until save, permission and rollback tests pass.</p></div>
        <StableAction area="settings" label="Open working Settings" />
      </header>
      <div className="cvoscRecordsGrid settings">
        {(data?.records || []).map((record) => <RecordCard key={`${record.id}-${record.title}`} record={record} />)}
        {!data?.records?.length ? <EmptyState state={data?.state} message={data?.message} /> : null}
        <article className="cvoscSafetyCard"><ShieldCheck size={28} /><h3>Owner authority remains locked</h3><p>Nothing in this replacement screen sends messages, charges cards, syncs accounting, files tax, pays staff, deletes records or changes financial truth.</p></article>
      </div>
    </section>
  );
}

function Screen({ area, data }) {
  if (area === "today") return <TodayView data={data} />;
  if (area === "command") return <CommandView data={data} />;
  if (area === "reports") return <ReportsView data={data} />;
  if (area === "settings") return <SettingsView data={data} />;
  return <RecordsView area={area} data={data} />;
}

export default function OfficeOSConnected() {
  const [area, setArea] = React.useState(initialArea);
  const [state, setState] = React.useState({ loading: true, data: null, error: "" });
  const activeArea = OWNER_AREAS.find((item) => item.id === area) || OWNER_AREAS[0];

  const load = React.useCallback(async (nextArea, signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loadOfficeArea(nextArea, { signal });
      setState({ loading: false, data, error: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setState({ loading: false, data: { area: nextArea, state: "unavailable", records: [], message: "The live read failed safely. No data was changed." }, error: error?.message || "Live read failed" });
    }
  }, []);

  React.useEffect(() => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    load(area, controller?.signal);
    return () => controller?.abort();
  }, [area, load]);

  const changeArea = (nextArea) => {
    setArea(nextArea);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextArea === "today") url.searchParams.delete("area");
      else url.searchParams.set("area", nextArea);
      window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const visibleState = state.loading ? "loading" : state.data?.state || "unavailable";

  return (
    <main className="cvoscRoot" data-connected-replacement="true" data-preview-only="true">
      <div className="cvoscPreviewBanner">
        <span>Private connected replacement</span>
        <strong>Real read-only records · working write flows remain protected</strong>
        <a href="/new-command-lab?surface=blueprint">View design blueprint</a>
      </div>

      <header className="cvoscTopbar">
        <button type="button" className="cvoscBrand" onClick={() => changeArea("today")}>
          <span>CV</span><div><strong>Churvox</strong><small>Office OS</small></div>
        </button>
        <div className="cvoscTitle"><small>Owner command floor</small><h1>{activeArea.label}</h1><p>{activeArea.purpose}</p></div>
        <div className="cvoscTopActions">
          <StatePill state={visibleState} />
          <button type="button" onClick={() => load(area)} disabled={state.loading}><RefreshCw size={16} className={state.loading ? "spin" : ""} /> Refresh</button>
        </div>
      </header>

      <section className="cvoscPromise">
        <div><ShieldCheck size={20} /><span>{PRODUCT_PROMISE}</span></div>
        <small>{formatWhen(state.data?.fetchedAt)}{state.error ? ` · ${state.error}` : ""}</small>
      </section>

      <AreaNav active={area} onChange={changeArea} />

      <section className="cvoscWorkspace" aria-live="polite">
        {state.loading && !state.data ? <section className="cvoscLoading"><RefreshCw size={26} className="spin" /><h2>Checking the current Churvox records</h2><p>No sample data will be substituted.</p></section> : <Screen area={area} data={state.data} />}
      </section>
    </main>
  );
}
