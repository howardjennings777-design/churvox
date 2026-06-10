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

function Style() {
  return <style>{`
    .teamRoleRoot,.teamRoleRoot *{box-sizing:border-box;color-scheme:light}.teamRoleRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui;padding:24px 24px 120px;overflow-x:hidden}.teamRoleWrap{max-width:1240px;margin:0 auto}.teamRoleHero{background:#0b1018;color:#fff;border-left:8px solid #f97316;border-radius:34px;padding:34px;box-shadow:0 24px 70px rgba(2,6,23,.24);overflow:hidden}.teamRoleHero small,.teamRolePanel small{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 14px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.teamRoleHero h1{max-width:980px;margin:16px 0 8px;font-size:clamp(42px,5.2vw,68px);line-height:.9;letter-spacing:-.07em;color:#fff}.teamRoleHero p{max-width:880px;color:#f8fafc;font-weight:900;line-height:1.5}.teamRoleGrid{display:grid;grid-template-columns:minmax(0,1fr)360px;gap:18px;margin-top:18px}.teamRolePanel{background:#fffaf0;border:1px solid rgba(15,23,42,.16);border-radius:30px;padding:22px;box-shadow:0 18px 46px rgba(2,6,23,.12);min-width:0}.teamRolePanel h2{margin:0 0 16px;font-size:34px;line-height:.95;letter-spacing:-.05em;color:#111827}.teamRoleFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.teamRoleField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}.teamRoleField input,.teamRoleField select{width:100%;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:inset 0 0 0 9999px #fffdf7!important}.teamRoleField input:focus,.teamRoleField select:focus{border-color:#f97316!important;background:#fff!important;box-shadow:0 0 0 4px rgba(249,115,22,.16),inset 0 0 0 9999px #fff!important}.teamRoleActions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.teamRoleActions button{border:0;border-radius:16px;padding:14px 18px;font-size:16px;font-weight:1000;cursor:pointer}.teamRoleSave{background:#16a34a;color:#052e16}.teamRoleClear{background:#0b1018;color:#fff}.teamRoleMessage{margin-top:16px;background:#14532d!important;color:#fff!important;border-radius:16px;padding:14px;font-weight:1000;line-height:1.45}.teamRoleList{display:grid;gap:10px}.teamRoleMember{background:#0b1018;color:#fff;border-left:6px solid #f97316;border-radius:18px;padding:14px}.teamRoleMember b{display:block;color:#fff}.teamRoleMember span{display:block;margin-top:6px;color:#fbbf24;font-size:12px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}.teamRoleMember small{display:block;margin-top:6px;color:#cbd5e1;font-size:12px;font-weight:900}.teamRoleEmpty{border-radius:18px;background:#111827;color:#fff;padding:14px;font-weight:1000;line-height:1.45}@media(min-width:1180px){.teamRoleRoot{padding-left:320px}.teamRoleWrap{max-width:calc(100vw - 370px);margin:0}}@media(max-width:1000px){.teamRoleRoot{padding:16px 16px 110px}.teamRoleGrid,.teamRoleFields{grid-template-columns:1fr}.teamRoleHero{padding:24px}.teamRoleHero h1{font-size:clamp(36px,12vw,56px)}}
  `}</style>;
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

  return <main className="teamRoleRoot"><Style /><section className="teamRoleWrap"><article className="teamRoleHero"><small>Team roles</small><h1>Invite the right person into the right role.</h1><p>Launch roles: Manager, Worker, Office Admin and Payroll. Owner remains the account owner.</p></article><section className="teamRoleGrid"><section className="teamRolePanel"><small>New invite</small><h2>Add team member</h2><div className="teamRoleFields"><label className="teamRoleField"><span>Name</span><input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="teamRoleField"><span>Email</span><input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="teamRoleField"><span>Phone</span><input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="teamRoleField"><span>Role</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="teamRoleActions"><button className="teamRoleSave" disabled={busy} onClick={saveMember}>{busy ? "Saving..." : `Invite ${roleName(form.role)}`}</button><button className="teamRoleClear" disabled={busy} onClick={() => setForm({ name: "", email: "", phone: "", role: "worker" })}>Clear</button></div><p className="teamRoleMessage">{message}</p></section></section></section></main>;
}
