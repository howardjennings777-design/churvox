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
  if (/team limit reached/i.test(text)) return text;
  if (/plan|upgrade|team management|limit/i.test(text)) return "This plan has reached its active worker limit.";
  if (/already registered/i.test(text)) return "That email is already connected to an account.";
  return text || "Could not add this team member.";
}

function cleanLimitPayload(raw) {
  const data = raw?.data?.data && typeof raw.data.data === "object" ? raw.data.data : raw?.data || raw;
  return data && typeof data === "object" ? data : null;
}

function nicePlanName(plan) {
  const key = String(plan || "solo").toLowerCase();
  if (key === "team" || key === "crew") return "Crew";
  if (key === "pro" || key === "operator") return "Operator";
  if (key === "enterprise" || key === "command") return "Command";
  return "Start";
}

export default function FreshTeamAddPerson({ onAdded, onNavigate, disabled = false, limitMessage = "" }) {
  const { get, post } = useApi();
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [checkingLimit, setCheckingLimit] = React.useState(false);
  const [planLimit, setPlanLimit] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    async function loadLimit() {
      setCheckingLimit(true);
      try {
        let res = await get("/team/limits");
        if (!res?.success) res = await get("/plan/limits");
        if (alive && res?.success) setPlanLimit(cleanLimitPayload(res));
      } catch {
        if (alive) setPlanLimit(null);
      } finally {
        if (alive) setCheckingLimit(false);
      }
    }
    loadLimit();
    return () => { alive = false; };
  }, [get]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const workerLimit = Number(planLimit?.max_workers);
  const workerCount = Number(planLimit?.usage?.workers ?? 0);
  const growthPacks = Number(planLimit?.growth_packs ?? planLimit?.extra_user_blocks ?? 0);
  const slotsLeft = Number(planLimit?.slots_left ?? Math.max(0, workerLimit - workerCount));
  const hasLimit = Number.isFinite(workerLimit) && workerLimit >= 0;
  const reached = disabled || (hasLimit && workerCount >= workerLimit);
  const reachedMessage = limitMessage || (hasLimit
    ? `${nicePlanName(planLimit?.plan)} allows ${workerLimit} active worker${workerLimit === 1 ? "" : "s"}. Current workers: ${workerCount}. Slots left: ${Number.isFinite(slotsLeft) ? slotsLeft : 0}.${growthPacks ? ` Growth Packs: ${growthPacks}.` : ""}`
    : "This plan has reached its active worker limit.");

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const role = form.role || "worker";
    setMessage("");
    setError("");

    if (reached) return setError(reachedMessage);
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
      {checkingLimit ? <div className="freshItem"><b>Checking plan limit</b><span>Confirming available worker slots.</span></div> : null}
      {hasLimit && !reached && !checkingLimit ? <div className="freshItem"><b>Worker slots</b><span>{workerCount}/{workerLimit} used. {Number.isFinite(slotsLeft) ? slotsLeft : 0} left.{growthPacks ? ` Growth Packs: ${growthPacks}.` : ""}</span></div> : null}
      {reached ? (
        <div className="freshItem need">
          <b>Worker limit reached</b>
          <span>{reachedMessage}</span>
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

      <button className="freshPrimary" type="submit" disabled={saving || checkingLimit || reached}>{saving ? "Saving…" : checkingLimit ? "Checking limit…" : reached ? "Worker limit reached" : "Add person / Save"}</button>
    </form>
  );
}
