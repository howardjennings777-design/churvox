import { clearChurvoxAuth } from "./logout";

const S = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "230px minmax(0, 1fr)",
    background: "linear-gradient(180deg, #ffffff 0%, #f5f8fb 100%)",
    color: "#233044",
  },
  sidebar: {
    position: "sticky",
    top: 0,
    height: "100vh",
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "rgba(248,251,253,.98)",
    borderRight: "1px solid #dbe7ee",
    boxShadow: "10px 0 32px rgba(15,23,42,.035)",
  },
  brand: {
    minHeight: 52,
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    border: 0,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #e1f8ff, #f1fffb)",
    border: "1px solid #b7e8f5",
  },
  nav: {
    display: "grid",
    gap: 5,
  },
  navButton: {
    minHeight: 42,
    width: "100%",
    padding: "0 12px",
    border: 0,
    borderRadius: 13,
    background: "transparent",
    color: "#233044",
    textAlign: "left",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  navButtonActive: {
    background: "#e5f7fc",
    color: "#0797b8",
    boxShadow: "inset 3px 0 0 #0797b8",
  },
  aiNote: {
    marginTop: "auto",
    display: "grid",
    gap: 6,
    padding: 16,
    borderRadius: 20,
    background: "#fff",
    border: "1px solid #dbe7ee",
    boxShadow: "0 10px 28px rgba(15,23,42,.055)",
  },
  main: {
    minWidth: 0,
    padding: "18px 22px 90px",
  },
  topbar: {
    minHeight: 64,
    display: "grid",
    gridTemplateColumns: "minmax(170px, auto) minmax(260px, 520px) auto",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
    padding: "12px 16px",
    borderRadius: 22,
    background: "rgba(255,255,255,.96)",
    border: "1px solid #dbe7ee",
    boxShadow: "0 10px 28px rgba(15,23,42,.055)",
  },
  search: {
    minHeight: 42,
    width: "100%",
    borderRadius: 999,
    border: "1px solid #dbe7ee",
    background: "#fff",
    color: "#101828",
    padding: "0 15px",
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  button: {
    minHeight: 40,
    borderRadius: 999,
    border: "1px solid #dbe7ee",
    background: "#fff",
    color: "#233044",
    fontWeight: 850,
    padding: "0 16px",
    cursor: "pointer",
  },
  primary: {
    background: "linear-gradient(135deg, #0797b8, #06b6d4)",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 14px 32px rgba(8,145,178,.20)",
  },
  mobileNav: {
    display: "none",
  },
};

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
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <button style={S.brand} onClick={() => setCurrent?.("hub")}>
          <span style={S.logo}>
            <img src="/brand/churvox-holo-c.svg" alt="" style={{ width: 24, height: 24 }} />
          </span>
          <span>
            <strong style={{ display: "block", color: "#101828", fontSize: 15, fontWeight: 900 }}>
              Churvox
            </strong>
            <small style={{ display: "block", color: "#66788a", fontSize: 11, fontWeight: 750 }}>
              AI Operator OS
            </small>
          </span>
        </button>

        <nav style={S.nav}>
          {nav.map((item) => (
            <button
              key={item.key}
              style={{
                ...S.navButton,
                ...(current === item.key ? S.navButtonActive : {}),
              }}
              onClick={() => setCurrent?.(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section style={S.aiNote}>
          <p style={{ margin: 0, color: "#91a3b4", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>
            AI OPERATOR
          </p>
          <strong style={{ color: "#101828", fontSize: 18 }}>
            {data?.aiActions?.length || 0} actions ready
          </strong>
          <span style={{ color: "#66788a", lineHeight: 1.4 }}>
            AI prepares the admin. You approve.
          </span>
        </section>

        {allowRoleSwitch ? (
          <select
            value={role}
            onChange={(event) => setRole?.(event.target.value)}
            style={{
              minHeight: 40,
              borderRadius: 13,
              border: "1px solid #dbe7ee",
              background: "#fff",
              color: "#233044",
              padding: "0 10px",
            }}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="office_admin">Office Admin</option>
            <option value="worker">Worker</option>
            <option value="payroll">Payroll</option>
          </select>
        ) : null}
      </aside>

      <main style={S.main}>
        <header style={S.topbar}>
          <div>
            <strong style={{ display: "block", color: "#101828" }}>{userName || "Owner"}</strong>
            <span style={{ display: "block", color: "#66788a", fontSize: 13 }}>
              {roleLabel(role)} workspace
            </span>
          </div>

          <input style={S.search} placeholder="Search anything..." />

          <div style={S.actions}>
            <button type="button" style={{ ...S.button, ...S.primary }} onClick={() => onCreate?.("jobs")}>
              New Job
            </button>
            <button type="button" style={S.button} onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
