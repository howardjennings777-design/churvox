import { clearChurvoxAuth } from "./logout";

function roleLabel(role) {
  return String(role || "owner").replaceAll("_", " ");
}

export default function OperatorShell({
  nav = [],
  current,
  setCurrent,
  role,
  setRole,
  allowRoleSwitch,
  userName,
  data,
  onCreate,
  children,
}) {
  function logout() {
    clearChurvoxAuth();
    try {
      localStorage.setItem("churvox_force_login", "true");
    } catch {}
    window.location.href = "/login?logged_out=1";
  }

  return (
    <div className="cx-shell">
      <aside className="cx-sidebar">
        <button className="cx-brand" onClick={() => setCurrent?.("hub")}>
          <span className="cx-logo">
            <img src="/brand/churvox-holo-c.svg" alt="" />
          </span>
          <span>
            <strong>Churvox</strong>
            <small>AI Operator OS</small>
          </span>
        </button>

        <nav className="cx-nav">
          {nav.map((item) => (
            <button
              key={item.key}
              className={current === item.key ? "active" : ""}
              onClick={() => setCurrent?.(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="cx-ai-note">
          <p>AI OPERATOR</p>
          <strong>{data?.aiActions?.length || 0} actions ready</strong>
          <span>AI prepares the admin. You approve.</span>
        </section>

        {allowRoleSwitch ? (
          <select className="cx-role-select" value={role} onChange={(event) => setRole?.(event.target.value)}>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="office_admin">Office Admin</option>
            <option value="worker">Worker</option>
            <option value="payroll">Payroll</option>
          </select>
        ) : null}
      </aside>

      <main className="cx-main">
        <header className="cx-topbar">
          <div>
            <strong>{userName || "Owner"}</strong>
            <span>{roleLabel(role)} workspace</span>
          </div>

          <input className="cx-search" placeholder="Search anything..." />

          <div className="cx-top-actions">
            <button type="button" className="primary" onClick={() => onCreate?.("jobs")}>
              New Job
            </button>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {children}
      </main>

      <nav className="cx-mobile-nav">
        {nav.slice(0, 5).map((item) => (
          <button
            key={item.key}
            className={current === item.key ? "active" : ""}
            onClick={() => setCurrent?.(item.key)}
          >
            {item.mobile || item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
