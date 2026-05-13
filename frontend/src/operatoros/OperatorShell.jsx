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
  allowRoleSwitch,
  userName,
  data,
  onCreate,
}) {
  function handleLogout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      sessionStorage.clear();

      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (error) {
      console.warn("Logout cleanup failed", error);
    }

    window.location.href = "/login";
  }

  const safeRole = role || "owner";

  return (
    <div className={`op-shell op-view-${current || "hub"} op-role-${safeRole}`} data-role={safeRole}>
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
          <p>{safeRole === "worker" ? "WORKER APP" : "AI OPERATOR"}</p>
          <strong>{safeRole === "worker" ? "Simple field workflow." : "Prepares the admin."}</strong>
          <span>{safeRole === "worker" ? "Jobs, notes, photos and completion stay clear." : "Owner approves anything risky."}</span>
        </section>

        <button className="op-logout-button" onClick={handleLogout}>
          <i>↪</i>
          <span>Log out</span>
        </button>
      </aside>

      <main className="op-main">
        <TopCommandBar
          role={role}
          setRole={setRole}
          allowRoleSwitch={allowRoleSwitch}
          userName={userName}
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
        <button className="op-mobile-logout" onClick={handleLogout}>Log out</button>
      </nav>
    </div>
  );
}
