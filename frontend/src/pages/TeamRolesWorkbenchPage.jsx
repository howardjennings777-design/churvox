import React from "react";
import { useApi } from "../hooks/useApi";

const ROLES = [
  ["worker", "Worker"],
  ["manager", "Manager"],
  ["office_admin", "Office Admin"],
  ["payroll", "Payroll"],
];

function roleName(value) {
  return Object.fromEntries(ROLES)[value] || "Worker";
}

export default function TeamRolesWorkbenchPage() {
  const api = useApi();
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", role: "worker" });
  const [members, setMembers] = React.useState([]);
  const [message, setMessage] = React.useState("Choose a role, add the person, and save the invite.");
  const [busy, setBusy] = React.useState(false);

  async function loadMembers() {
    try {
      const res = await api.get("/logic/team-members");
      const list = res?.data?.members || res?.members || [];
      setMembers(Array.isArray(list) ? list : []);
    } catch {
      setMembers([]);
    }
  }

  React.useEffect(() => { loadMembers(); }, []);

  async function saveMember() {
    if (!form.name.trim() || !form.email.trim()) {
      setMessage("Name and email are required.");
      return;
    }
    setBusy(true);
    setMessage("Saving team member...");
    try {
      const res = await api.post("/logic/team-members", form, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      setMessage(res?.data?.message || `${roleName(form.role)} saved.`);
      setForm({ name: "", email: "", phone: "", role: "worker" });
      loadMembers();
    } catch (error) {
      setMessage(error?.message || "Could not save team member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f6f1e7", padding: 24, color: "#111827", fontFamily: "Inter, system-ui" }}>
      <section style={{ maxWidth: 1280, margin: "0 auto" }}>
        <article style={{ background: "#0b1018", color: "white", borderLeft: "8px solid #f97316", borderRadius: 34, padding: 30 }}>
          <small style={{ color: "#fbbf24", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>Team roles</small>
          <h1 style={{ fontSize: 64, lineHeight: .9, margin: "18px 0 10px", letterSpacing: "-.07em" }}>Invite the right person into the right role.</h1>
          <p style={{ color: "#f8fafc", fontWeight: 800 }}>Launch roles: Manager, Worker, Office Admin, and Payroll. Owner remains the account owner.</p>
        </article>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 18, marginTop: 18 }}>
          <section style={{ background: "#fffaf0", borderRadius: 30, padding: 22 }}>
            <h2>Add team member</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </div>
            <button disabled={busy} onClick={saveMember} style={{ marginTop: 16, border: 0, borderRadius: 16, padding: "14px 18px", fontWeight: 900, background: "#16a34a", color: "#052e16" }}>{busy ? "Saving..." : `Save ${roleName(form.role)}`}</button>
            <p style={{ marginTop: 16, background: "#14532d", color: "white", borderRadius: 16, padding: 14, fontWeight: 900 }}>{message}</p>
          </section>

          <aside style={{ background: "#fffaf0", borderRadius: 30, padding: 22 }}>
            <h2>{members.length} team members</h2>
            {members.map((member) => <article key={member.id || member.email} style={{ background: "#0b1018", color: "white", borderLeft: "6px solid #f97316", borderRadius: 18, padding: 14, marginTop: 10 }}><b>{member.name || member.email}</b><br /><span>{roleName(member.role)} · {member.status || "active"}</span><br /><small>{member.email}</small></article>)}
          </aside>
        </section>
      </section>
    </main>
  );
}
