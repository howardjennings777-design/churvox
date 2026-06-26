import React from "react";
import { useApi } from "../hooks/useApi";

const empty = { name: "", email: "", phone: "", role: "worker" };
const roles = [
  ["worker", "Worker"],
  ["lead_worker", "Lead worker"],
  ["subcontractor", "Subcontractor"],
  ["payroll", "Payroll only"],
];

function friendlyError(message) {
  const text = String(message || "");
  const limitMatch = text.match(/team limit reached\s*\(([^)]*)\)/i);
  if (limitMatch) return `Team limit reached (${limitMatch[1]}). Remove an inactive worker, upgrade, or add a Command Growth Pack.`;
  if (/plan|upgrade|team management|limit/i.test(text)) {
    return "This plan has reached its active worker limit. Remove an inactive worker, upgrade, or add a Command Growth Pack.";
  }
  if (/already registered/i.test(text)) return "That email is already connected to an account.";
  return text || "Could not add this team member.";
}

export default function FreshTeamAddPerson({ onAdded, onNavigate, disabled = false, limitMessage = "" }) {
  const { post } = useApi();
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const role = form.role || "worker";
    setMessage("");
    setError("");

    if (disabled) return setError(limitMessage || "This plan has reached its active worker limit.");
    if (!name) return setError("Enter the person's name.");
    if (!email) return setError("Enter an email address so Churvox can send the invite.");

    setSaving(true);
    const res = await post("/team/workers", { name, email, phone, role, team_role: role });
    setSaving(false);

    if (!res.success) {
      setError(friendlyError(res.error));
      return;
    }

    setForm(empty);
    setMessage(`${name} was added and the invite was prepared.`);
    onAdded?.();
  }

  return (
    <form className="freshActions" onSubmit={submit}>
      {disabled ? (
        <div className="freshItem need">
          <b>Worker limit reached</b>
          <span>{limitMessage || "This plan has reached its active worker limit."}</span>
          <button className="freshGhost" type="button" onClick={() => onNavigate?.("plans")}>View plans</button>
        </div>
      ) : null}
      {error ? (
        <div className="freshItem need">
          <b>Could not add person</b>
          <span>{error}</span>
          {/Crew|Operator|Command|Upgrade|Growth Pack|limit/i.test(error) ? <button className="freshGhost" type="button" onClick={() => onNavigate?.("plans")}>View plans</button> : null}
        </div>
      ) : null}
      {message ? <div className="freshItem"><b>Done</b><span>{message}</span></div> : null}

      <label className="freshField"><span>Name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Person's name" /></label>
      <label className="freshField"><span>Email</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="hello@churvox.com" /></label>
      <label className="freshField"><span>Phone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone number" /></label>
      <label className="freshField"><span>Role</span><select value={form.role} onChange={(event) => update("role", event.target.value)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

      <button className="freshPrimary" type="submit" disabled={saving || disabled}>{saving ? "Saving…" : disabled ? "Worker limit reached" : "Add person / Save"}</button>
    </form>
  );
}
