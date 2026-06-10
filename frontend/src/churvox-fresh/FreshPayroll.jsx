import React from "react";
import { readFreshFocus } from "./freshFocus";

const PAYROLL_STORAGE_KEY = "churvox:fresh-payroll:v1";
const PAYROLL_PERIOD_KEY = "churvox:fresh-payroll-period:v1";

const seedPayroll = [
  {
    id: "pay-1",
    name: "Matiu Rangi",
    role: "Worker",
    status: "Ready",
    ordinaryHours: 31.5,
    extraHours: 2,
    hourlyRate: 28,
    adjustment: 0,
    notes: "Normal week. Lawn route complete.",
  },
  {
    id: "pay-2",
    name: "Ana Williams",
    role: "Lead worker",
    status: "Needs review",
    ordinaryHours: 36,
    extraHours: 4,
    hourlyRate: 34,
    adjustment: 25,
    notes: "Manual adjustment for late finish on garden tidy.",
  },
  {
    id: "pay-3",
    name: "Tama Smith",
    role: "Worker",
    status: "Draft",
    ordinaryHours: 8,
    extraHours: 0,
    hourlyRate: 27,
    adjustment: 0,
    notes: "Invite accepted. Limited hours this period.",
  },
];

const filters = ["All", "Draft", "Needs review", "Ready", "Approved"];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function grossPay(person) {
  const hours = Number(person.ordinaryHours || 0) + Number(person.extraHours || 0);
  return hours * Number(person.hourlyRate || 0) + Number(person.adjustment || 0);
}

function loadPayroll() {
  try {
    if (typeof window === "undefined") return seedPayroll;

    const saved = window.localStorage.getItem(PAYROLL_STORAGE_KEY);
    if (!saved) return seedPayroll;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedPayroll;
  } catch {
    return seedPayroll;
  }
}

function loadPeriod() {
  try {
    if (typeof window === "undefined") return "Weekly · Current period";
    return window.localStorage.getItem(PAYROLL_PERIOD_KEY) || "Weekly · Current period";
  } catch {
    return "Weekly · Current period";
  }
}

export default function FreshPayroll({ onNavigate }) {
  const [people, setPeople] = React.useState(loadPayroll);
  const [period, setPeriod] = React.useState(loadPeriod);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("payroll", people[0]?.id || ""));
  const [filter, setFilter] = React.useState("All");

  const selected = people.find((person) => person.id === selectedId) || people[0];
  const visiblePeople = filter === "All" ? people : people.filter((person) => person.status === filter);
  const totalGross = people.reduce((sum, person) => sum + grossPay(person), 0);
  const totalHours = people.reduce((sum, person) => sum + Number(person.ordinaryHours || 0) + Number(person.extraHours || 0), 0);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(people));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [people]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PAYROLL_PERIOD_KEY, period);
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [period]);

  function updateSelectedPerson(patch) {
    if (!selected) return;

    setPeople((current) =>
      current.map((person) =>
        person.id === selected.id
          ? { ...person, ...patch }
          : person
      )
    );
  }

  function resetPayroll() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PAYROLL_STORAGE_KEY);
        window.localStorage.removeItem(PAYROLL_PERIOD_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setPeople(seedPayroll);
    setPeriod("Weekly · Current period");
    setSelectedId(seedPayroll[0].id);
    setFilter("All");
  }

  function exportCsv() {
    const rows = [
      ["Pay period", period],
      [],
      ["Name", "Role", "Status", "Ordinary hours", "Extra hours", "Hourly rate", "Adjustment", "Gross pay", "Notes"],
      ...people.map((person) => [
        person.name,
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
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = "churvox-payroll-preview.csv";
    link.click();

    URL.revokeObjectURL(objectUrl);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Payroll</span>
        <h1>Payroll</h1>
        <p>Review hours, adjustments and gross pay. Churvox does not submit tax, government forms or bank payout files.</p>
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
      </section>

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

          {visiblePeople.map((person) => (
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

          {visiblePeople.length === 0 && (
            <div className="freshItem">
              <b>No pay records</b>
              <span>Change filter or reset preview payroll.</span>
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
                  onChange={(event) => updateSelectedPerson({ ordinaryHours: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Extra hours</span>
                <input
                  value={selected.extraHours}
                  onChange={(event) => updateSelectedPerson({ extraHours: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Hourly rate</span>
                <input
                  value={selected.hourlyRate}
                  onChange={(event) => updateSelectedPerson({ hourlyRate: Number(event.target.value) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Manual adjustment</span>
                <input
                  value={selected.adjustment}
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
            <button className="freshGhost" onClick={() => onNavigate?.("reports")}>
              Open reports
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetPayroll}>
              Reset payroll
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
