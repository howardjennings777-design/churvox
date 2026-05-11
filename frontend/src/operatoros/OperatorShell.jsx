import FloatingLogo from "./components/FloatingLogo";
import TopCommandBar from "./components/TopCommandBar";

const icons = {
  hub: "⬡",
  queue: "◆",
  jobs: "⌘",
  clients: "◎",
  crew: "♧",
  quotes: "▤",
  invoices: "▥",
  proof: "✓",
  payroll: "◌",
  import: "⇪",
  system: "◍",
  settings: "⚙",
};

export default function OperatorShell({
  nav,
  current,
  setCurrent,
  children,
  role,
  setRole,
  data,
  onCreate,
}) {
  return (
    <div className="op-shell">
      <aside className="op-sidebar">
        <button className="op-brand" onClick={() => setCurrent("hub")}>
          <FloatingLogo wordmark />
        </button>

        <nav>
          {nav.map((item) => (
            <button
              key={item.key}
              className={current === item.key ? "active" : ""}
              onClick={() => setCurrent(item.key)}
            >
              <i>{icons[item.key] || "•"}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="op-ai-card">
          <p>AI OPERATOR</p>
          <strong>Prepares the admin.</strong>
          <span>Owner approves anything risky.</span>
        </section>
      </aside>

      <main className="op-main">
        <TopCommandBar
          role={role}
          setRole={setRole}
          data={data}
          onNav={setCurrent}
          onCreate={onCreate}
        />
        {children}
      </main>

      <nav className="op-mobile-nav">
        {nav
          .filter((item) => ["hub", "queue", "jobs", "invoices"].includes(item.key))
          .map((item) => (
            <button
              key={item.key}
              className={current === item.key ? "active" : ""}
              onClick={() => setCurrent(item.key)}
            >
              {item.mobile || item.label}
            </button>
          ))}
        <button onClick={() => setCurrent("settings")}>More</button>
      </nav>
    </div>
  );
}
