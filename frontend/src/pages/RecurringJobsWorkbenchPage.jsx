import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const blank = { job_id: "", title: "", client: "", address: "", scheduled_date: "", recurring: "none", custom_repeat_days: "", notes: "", price: "" };
const repeatOptions = [["none", "One-off"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"], ["custom", "Custom days"]];

function idOf(job) { return String(job?.id || job?._id || ""); }
function first(...x) { return x.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || ""; }
function labelRepeat(value) { return Object.fromEntries(repeatOptions)[value] || "One-off"; }

function formFromJob(job) {
  return { job_id: idOf(job), title: first(job.title, job.job_title), client: first(job.customer_name, job.client_name, job.client?.name), address: first(job.address, job.job_address), scheduled_date: first(job.scheduled_date, job.date), recurring: first(job.recurring_frequency, job.recurring, "none"), custom_repeat_days: first(job.custom_repeat_days), notes: first(job.notes), price: first(job.price, job.amount) };
}

export default function RecurringJobsWorkbenchPage() {
  const api = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [form, setForm] = React.useState(blank);
  const [message, setMessage] = React.useState("Pick a job or create a recurring job setup.");
  const [busy, setBusy] = React.useState(false);

  async function loadJobs() {
    try {
      const res = await api.get("/jobs");
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.jobs) ? res.data.jobs : [];
      setJobs(list);
    } catch { setJobs([]); }
  }
  React.useEffect(() => { loadJobs(); }, []);
  const update = (k, v) => setForm((old) => ({ ...old, [k]: v }));

  async function saveRecurring() {
    setBusy(true);
    setMessage("Saving recurring settings...");
    try {
      const res = await api.post("/logic/jobs/recurring", { ...form, recurring_frequency: form.recurring }, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      const job = res?.data?.job || res?.job;
      if (job) setForm(formFromJob(job));
      setMessage(res?.data?.message || "Recurring job settings saved.");
      toast.success("Recurring job saved");
      loadJobs();
    } catch (error) { setMessage(error?.message || "Could not save recurring settings"); toast.error(error?.message || "Could not save recurring settings"); }
    finally { setBusy(false); }
  }

  async function completeRecurring() {
    if (!form.job_id) { setMessage("Pick an existing job first."); return; }
    setBusy(true);
    setMessage("Completing job and checking repeat schedule...");
    try {
      const res = await api.post(`/logic/jobs/${encodeURIComponent(form.job_id)}/complete-recurring`, {}, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Complete failed");
      const next = res?.data?.next_job || res?.next_job;
      setMessage(next ? "Job completed and next recurring job created." : "Job completed. No next recurring job was needed.");
      toast.success("Job completed");
      loadJobs();
    } catch (error) { setMessage(error?.message || "Could not complete recurring job"); toast.error(error?.message || "Could not complete job"); }
    finally { setBusy(false); }
  }

  return <main style={{ minHeight: "100vh", background: "#f6f1e7", padding: 24, color: "#111827", fontFamily: "Inter, system-ui" }}><section style={{ maxWidth: 1440, margin: "0 auto" }}><article style={{ background: "#0b1018", color: "white", borderLeft: "8px solid #f97316", borderRadius: 34, padding: 30 }}><small style={{ color: "#fbbf24", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>Jobs</small><h1 style={{ fontSize: 64, lineHeight: .9, margin: "18px 0 10px", letterSpacing: "-.07em" }}>Recurring jobs that actually repeat.</h1><p style={{ color: "#f8fafc", fontWeight: 800 }}>Save weekly, fortnightly, monthly or custom repeat settings. Completing a recurring job can create the next job.</p></article><section style={{ display: "grid", gridTemplateColumns: "330px minmax(0,1fr) 330px", gap: 18, marginTop: 18 }}><aside style={{ background: "#fffaf0", borderRadius: 30, padding: 18 }}><h2>Jobs</h2>{jobs.slice(0, 12).map((job) => <button key={idOf(job)} onClick={() => setForm(formFromJob(job))} style={{ display: "block", width: "100%", textAlign: "left", marginTop: 10, border: "2px solid #ead4b6", borderRadius: 18, background: "white", padding: 12, fontWeight: 900 }}>{first(job.title, job.customer_name, "Untitled job")}<br /><small>{first(job.status, job.recurring_frequency, idOf(job))}</small></button>)}</aside><section style={{ background: "#fffaf0", borderRadius: 30, padding: 22 }}><h2>Recurring setup</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><input placeholder="Job title" value={form.title} onChange={(e) => update("title", e.target.value)} /><input placeholder="Client" value={form.client} onChange={(e) => update("client", e.target.value)} /><input placeholder="Address" value={form.address} onChange={(e) => update("address", e.target.value)} /><input placeholder="Scheduled date/time" value={form.scheduled_date} onChange={(e) => update("scheduled_date", e.target.value)} /><select value={form.recurring} onChange={(e) => update("recurring", e.target.value)}>{repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input placeholder="Custom repeat days" value={form.custom_repeat_days} onChange={(e) => update("custom_repeat_days", e.target.value)} /><input placeholder="Price / rate" value={form.price} onChange={(e) => update("price", e.target.value)} /><input placeholder="Job ID" value={form.job_id} onChange={(e) => update("job_id", e.target.value)} /><textarea placeholder="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} style={{ gridColumn: "1 / -1", minHeight: 110 }} /></div></section><aside style={{ background: "#fffaf0", borderRadius: 30, padding: 22 }}><h2>Owner controls</h2><p style={{ background: "#14532d", color: "white", borderRadius: 16, padding: 14, fontWeight: 900 }}>{message}</p><button disabled={busy} onClick={saveRecurring} style={{ width: "100%", border: 0, borderRadius: 16, padding: 14, fontWeight: 900, background: "#16a34a", color: "#052e16" }}>{busy ? "Saving..." : `Save ${labelRepeat(form.recurring)}`}</button><button disabled={busy} onClick={completeRecurring} style={{ width: "100%", border: 0, borderRadius: 16, padding: 14, fontWeight: 900, background: "#111827", color: "white", marginTop: 10 }}>Complete + create next</button></aside></section></section></main>;
}
