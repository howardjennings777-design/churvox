export const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
export const listFrom = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.jobs) ? value.jobs : Array.isArray(value?.items) ? value.items : Array.isArray(value?.results) ? value.results : Array.isArray(value?.data?.jobs) ? value.data.jobs : [];
export const oid = (value) => !value ? "" : typeof value === "string" || typeof value === "number" ? String(value) : typeof value === "object" ? oid(value.$oid || value.oid || value.id || value._id || value.job_id || "") : "";
export const idOf = (job) => oid(job?.id || job?._id || job?.job_id || job?.uuid);
export const titleOf = (job) => clean(job?.title || job?.job_name || job?.job_title || job?.service_type || job?.description || "Job");
export const clientOf = (job) => clean(job?.client_name || job?.customer_name || job?.client || job?.customer || "Customer");
export const addressOf = (job) => clean(job?.address || job?.site_address || job?.service_address || job?.job_address || job?.location || "");
export const instructionsOf = (job) => clean(job?.worker_instructions || job?.instructions || job?.job_notes || job?.description || job?.notes || "No special instructions.");
export const statusOf = (job) => clean(job?.status || job?.job_status || job?.workflow_status || "assigned").toLowerCase().replaceAll(" ", "_");
export const dateOf = (job) => clean(job?.scheduled_date || job?.date || job?.start || job?.due_date).slice(0, 10);
export const timeOf = (job) => clean(job?.scheduled_time || job?.time || job?.start_time || "");
export const isDone = (job) => /complete|completed|done|finished|cancelled|archived/.test(statusOf(job));
export const isStarted = (job) => /progress|started|active/.test(statusOf(job));
export const todayKey = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
export function sortJobs(a, b) { return `${dateOf(a) || "9999-12-31"} ${timeOf(a) || "99:99"}`.localeCompare(`${dateOf(b) || "9999-12-31"} ${timeOf(b) || "99:99"}`); }
export async function sendWorkerEvent(post, job, state, source) {
  const address = addressOf(job);
  const payload = { state, source, job_id: idOf(job), job_title: titleOf(job), address, location: address };
  try { await post("/onsite/worker-beacon", payload); return true; }
  catch { return false; }
}
