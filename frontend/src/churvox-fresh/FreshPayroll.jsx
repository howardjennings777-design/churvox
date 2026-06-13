import React from "react";
import { readFreshFocus } from "./freshFocus";
import { useApi } from "../hooks/useApi";

const PAYROLL_PERIOD_KEY = "churvox:fresh-payroll-period:v1";
const PAYROLL_EDIT_KEY = "churvox:fresh-payroll-edits:v1";

const filters = ["All", "Draft", "Needs review", "Ready", "Approved"];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(worker, fallback) {
  const raw = worker?.id || worker?._id || worker?.worker_id || worker?.user_id || fallback;
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || fallback;
  return String(raw || fallback);
}

function roleOf(value) {
  const text = String(value || "worker").toLowerCase();
  if (text.includes("lead")) return "Lead worker";
  if (text.includes("sub")) return "Subcontractor";
  if (text.includes("payroll")) return "Payroll only";
  if (text.includes("manager")) return "Manager";
  return "Worker";
}

function defaultStatus(worker) {
  const status = String(worker?.status || "").toLowerCase();
  if (status.includes("active")) return "Ready";
  if (status.includes("invite")) return "Draft";
  return "Needs review";
}

function numberFrom(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function loadPeriod() {
  try {
    if (typeof window === "undefined") return "Weekly · Current period";
    return window.localStorage.getItem(PAYROLL_PERIOD_KEY) || "Weekly · Current period";
  } catch {
    return "Weekly · Current period";
  }
}

function loadEdits() {
  try {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem(PAYROLL_EDIT_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveEdits(edits) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAYROLL_EDIT_KEY, JSON.stringify(edits));
    }
  } catch {
    // Keep payroll usable if local storage is blocked.
  }
}

function grossPay(person) {
  const hours = Number(person.ordinaryHours || 0) + Number(person.extraHours || 0);
  return hours * Number(person.hourlyRate || 0) + Number(person.adjustment || 0);
}

function normalizePayroll(worker, index, edits = {}) {
  const id = idOf(worker, `worker-${index}`);
  const saved = edits[id] || {};
  const ordinaryHours = numberFrom(
    saved.ordinaryHours,
    worker?.ordinary_hours,
    worker?.ordinaryHours,
    worker?.hours_worked,
    worker?.hoursWorked,
    worker?.payroll_hours,
    worker?.payrollHours
  );
  const extraHours = numberFrom(saved.extraHours, worker?.extra_hours, worker?.extraHours, worker?.overtime_hours, worker?.overtimeHours);
  const hourlyRate = numberFrom(saved.hourlyRate, worker?.pay_rate, worker?.payRate, worker?.hourly_rate, worker?.hourlyRate);

  return {
    id,
    name: worker?.name || worker?.full_name || worker?.display_name || "Unnamed worker",
    email: worker?.email || "",
    phone: worker?.phone || worker?.mobile || "",
    role: roleOf(worker?.team_role || worker?.worker_role || worker?.role),
    status: saved.status || defaultStatus(worker),
    ordinaryHours,
    extraHours,
    hourlyRate,
    adjustment: Number(saved.adjustment ?? worker?.adjustment ?? 0) || 0,
    notes: saved.notes || worker?.notes || (ordinaryHours + extraHours > 0 ? "Hours imported for review." : "No hours captured yet. Add hours before approving pay."),
  };
}

export default function FreshPayroll({ onNavigate }) {
  const { get } = useApi();
  const [people, setPeople] = React.useState([]);
  const [period, setPeriod] = React.useState(loadPeriod);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("payroll", ""));
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");

  const visiblePeople = filter === "All" ? people : people.filter((person) => person.status === filter);
  const selected = people.find((person) => person.id === selectedId) || visiblePeople[0] || people[0];
  const totalGross = people.reduce((sum, person) => sum + grossPay(person), 0);
  const totalHours = people.reduce((sum, person) => sum + Number(person.ordinaryHours || 0) + Number(person.extraHours || 0), 0);

  const loadPayroll = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await get("/team/workers");
      const edits = loadEdits();
      const rows = listFrom(payload)
        .map((worker, index) => normalizePayroll(worker, index, edits))
        .sort((a, b) => a.name.localeCompare(b.name));

      setPeople(rows);
      setSelectedId((current) => (rows.some((person) => person.id === current) ? current : rows[0]?.id || ""));
    } catch (err) {
      setError(err?.message || "Payroll could not load workers.");
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PAYROLL_PERIOD_KEY, period);
      }
    } catch {
      // Keep payroll usable if local storage is blocked.
    }
  }, [period]);

  function updateSelectedPerson(patch) {
    if (!selected) return;

    setPeople((current) => {
      const next = current.map((person) => (person.id === selected.id ? { ...person, ...patch } : person));
      const updated = next.find((person) => person.id === selected.id);
      const edits = loadEdits();

      edits[selected.id] = {
        ordinaryHours: updated.ordinaryHours,
        extraHours: updated.extraHours,
        hourlyRate: updated.hourlyRate,
        adjustment: updated.adjustment,
        status: updated.status,
        notes: updated.notes,
      };
      saveEdits(edits);

      return next;
    });
  }

  function resetPayroll() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PAYROLL_EDIT_KEY);
        window.localStorage.removeItem(PAYROLL_PERIOD_KEY);
      }
    } catch {
      // Ignore storage errors.
    }

    setPeriod("Weekly · Current period");
    setFilter("All");
    setActionMessage("Payroll edits reset. Reloaded real workers.");
    loadPayroll();
  }

  function exportCsv() {
    const rows = [
      ["Pay period", period],
      [],
      ["Name", "Email", "Role", "Status", "Ordinary hours", "Extra hours", "Hourly rate", "Adjustment", "Gross pay", "Notes"],
      ...people.map((person) => [
        person.name,
        person.email,
        person.role,
        person.status,
        person.ordinaryHours,
        person.extraHours,
        person.hourlyRate,
        person.adjustment,
        grossPay(person).toFixed(2),
        person.notes,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = "churvox-payroll-review.csv";
    link.click();

    URL.revokeObjectURL(objectUrl);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Payroll</span>
        <h1>Payroll</h1>
        <p>Review worker hours, adjustments and gross pay from real Team records. Churvox does not submit tax, government forms or bank payout files.</p>
      </header>

      <section className="freshPayrollNotice">
        <b>Payroll safety rule</b>
        <span>No tax filing. No government submission. No bank payment files. Export review CSV only.</span>
      </section>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{money(totalGross)}</h2>
          <p>Gross pay preview</p>
        </aside>
        <aside className="freshCard">
          <h2>{totalHours.toFixed(1)}</h2>
          <p>Total hours</p>
        </aside>
        <aside className="freshCard">
          <h2>{people.filter((person) => person.status === "Needs review").length}</h2>
          <p>Need review</p>
        </aside>
      </section>

      <section className="freshCard freshPayrollPeriod">
        <label className="freshField">
          <span>Pay period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option>Weekly · Current period</option>
            <option>Weekly · Next period</option>
            <option>Fortnightly · Current period</option>
            <option>Fortnightly · Next period</option>
            <option>Monthly · Current period</option>
          </select>
        </label>
        <button type="button" className="freshGhost" onClick={loadPayroll}>Refresh workers</button>
      </section>

      {error && (
        <section className="freshCard freshNotice need">
          <b>Payroll needs attention</b>
          <span>{error}</span>
        </section>
      )}

      {actionMessage && (
        <section className="freshCard freshNotice">
          <b>Payroll updated</b>
          <span>{actionMessage}</span>
        </section>
      )}

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? people.length : people.filter((person) => person.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Pay list</h2>

          {loading && (
            <div className="freshItem">
              <b>Loading payroll</b>
              <span>Checking real Team workers.</span>
            </div>
          )}

          {!loading && visiblePeople.map((person) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === person.id ? "active" : ""} ${person.status === "Needs review" ? "need" : ""}`}
              key={person.id}
              onClick={() => setSelectedId(person.id)}
            >
              <b>{person.name}</b>
              <span>{person.status} · {(Number(person.ordinaryHours) + Number(person.extraHours)).toFixed(1)} hrs · {money(grossPay(person))}</span>
            </button>
          ))}

          {!loading && visiblePeople.length === 0 && (
            <div className="freshItem">
              <b>No pay records</b>
              <span>{people.length ? "Change filter to see more workers." : "Add workers in Team before running payroll."}</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.name || "Select person"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Role</span>
                  <b>{selected.role}</b>
                </div>
                <div>
                  <span>Total hours</span>
                  <b>{(Number(selected.ordinaryHours) + Number(selected.extraHours)).toFixed(1)}</b>
                </div>
                <div>
                  <span>Gross pay</span>
                  <b>{money(grossPay(selected))}</b>
                </div>
              </div>

              <label className="freshField">
                <span>Ordinary hours</span>
                <input
                  value={selected.ordinaryHours}
                  inputMode="decimal"
                  onChange={(event) => updateSelectedPerson({ ordinaryHours: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Extra hours</span>
                <input
                  value={selected.extraHours}
                  inputMode="decimal"
                  onChange={(event) => updateSelectedPerson({ extraHours: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Hourly rate</span>
                <input
                  value={selected.hourlyRate}
                  inputMode="decimal"
                  onChange={(event) => updateSelectedPerson({ hourlyRate: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Manual adjustment</span>
                <input
                  value={selected.adjustment}
                  inputMode="decimal"
                  onChange={(event) => updateSelectedPerson({ adjustment: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Payroll notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(event) => updateSelectedPerson({ notes: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedPerson({ status: "Ready" })}>
              Mark ready
            </button>
            <button className="freshDark" onClick={() => updateSelectedPerson({ status: "Approved" })}>
              Approve pay
            </button>
            <button className="freshOrange" onClick={() => updateSelectedPerson({ status: "Needs review" })}>
              Needs review
            </button>
            <button className="freshPrimary" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("team")}>
              Open Team
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetPayroll}>
              Reset payroll edits
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
