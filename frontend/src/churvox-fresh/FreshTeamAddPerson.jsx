import React from "react";
import { useApi } from "../hooks/useApi";

const empty = { name: "", email: "", phone: "" };

export default function FreshTeamAddPerson({ onAdded }) {
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
    setMessage("");
    setError("");

    if (!name) return setError("Enter a name.");
    if (!email) return setError("Enter an email address.");

    setSaving(true);
    const res = await post("/team/workers", { name, email, phone });
    setSaving(false);

    if (!res.success) {
      setError(res.error || "Could not add this team member.");
      return;
    }

    setForm(empty);
    setMessage(`${name} was added.`);
    onAdded?.();
  }

  return (
    <form className="freshActions" onSubmit={submit}>
      {error ? <div className="freshItem need"><b>Could not add person</b><span>{error}</span></div> : null}
      {message ? <div className="freshItem"><b>Done</b><span>{message}</span></div> : null}
      <label className="freshField"><span>Name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Name" /></label>
      <label className="freshField"><span>Email</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="Email" /></label>
      <label className="freshField"><span>Phone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone" /></label>
      <button className="freshPrimary" type="submit" disabled={saving}>{saving ? "Adding…" : "Add person"}</button>
    </form>
  );
}
