import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const blank = {
  job_id: "",
  title: "",
  client: "",
  address: "",
  scheduled_date: "",
  recurring: "none",
  custom_repeat_days: "",
  notes: "",
  price: "",
};

const repeatOptions = [
  ["none", "One-off"],
  ["weekly", "Weekly"],
  ["fortnightly", "Fortnightly"],
  ["monthly", "Monthly"],
  ["custom", "Custom days"],
];

function idOf(job) {
  return String(job?.id || job?._id || "");
}

function first(...x) {
  return x.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || "";
}

function labelRepeat(value) {
  return Object.fromEntries(repeatOptions)[value] || "One-off";
}

function formFromJob(job) {
  return {
    job_id: idOf(job),
    title: first(job.title, job.job_title),
    client: first(job.customer_name, job.client_name, job.client?.name),
    address: first(job.address, job.job_address),
    scheduled_date: first(job.scheduled_date, job.date),
    recurring: first(job.recurring_frequency, job.recurring, "none"),
    custom_repeat_days: first(job.custom_repeat_days),
    notes: first(job.notes),
    price: first(job.price, job.amount),
  };
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
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.jobs)
            ? res.data.jobs
            : [];
      setJobs(list);
    } catch {
      setJobs([]);
    }
  }

  React.useEffect(() => {
    loadJobs();
  }, []);

  const update = (k, v) => setForm((old) => ({ ...old, [k]: v }));

  async function saveRecurring() {
    setBusy(true);
    setMessage("Saving recurring settings...");

    try {
      const res = await api.post(
        "/logic/jobs/recurring",
        { ...form, recurring_frequency: form.recurring },
        { timeout: 25000 }
      );

      if (res?.success === false || res?.data?.success === false) {
        throw new Error(res?.error || res?.data?.error || "Save failed");
      }

      const job = res?.data?.job || res?.job;
      if (job) setForm(formFromJob(job));

      setMessage(res?.data?.message || "Recurring job settings saved.");
      toast.success("Recurring job saved");
      loadJobs();
    } catch (error) {
      setMessage(error?.message || "Could not save recurring settings");
      toast.error(error?.message || "Could not save recurring settings");
    } finally {
      setBusy(false);
    }
  }

  async function completeRecurring() {
    if (!form.job_id) {
      setMessage("Pick an existing job first.");
      return;
    }

    setBusy(true);
    setMessage("Completing job and checking repeat schedule...");

    try {
      const res = await api.post(
        `/logic/jobs/${encodeURIComponent(form.job_id)}/complete-recurring`,
        {},
        { timeout: 25000 }
      );

      if (res?.success === false || res?.data?.success === false) {
        throw new Error(res?.error || res?.data?.error || "Complete failed");
      }

      const next = res?.data?.next_job || res?.next_job;
      setMessage(next ? "Job completed and next recurring job created." : "Job completed. No next recurring job was needed.");
      toast.success("Job completed");
      loadJobs();
    } catch (error) {
      setMessage(error?.message || "Could not complete recurring job");
      toast.error(error?.message || "Could not complete job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="jobCleanPage">
      <style>{`
        .jobCleanPage,
        .jobCleanPage * {
          box-sizing: border-box;
        }

        .jobCleanPage {
          width: 100%;
          color: #111827;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .jobCleanWrap {
          width: 100%;
          max-width: 1260px;
          margin: 0;
        }

        .jobCleanHero {
          background:
            radial-gradient(circle at 86% -20%, rgba(249,115,22,.48), transparent 30%),
            linear-gradient(135deg, #0b1018 0%, #111827 58%, #070b12 100%);
          color: white;
          border-left: 8px solid #f97316;
          border-radius: 30px;
          padding: 26px 30px;
          box-shadow: 0 18px 48px rgba(15,23,42,.18);
        }

        .jobCleanHero small {
          color: #fbbf24;
          font-weight: 1000;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .jobCleanHero h1 {
          max-width: 900px;
          margin: 14px 0 10px;
          font-size: clamp(36px, 5.2vw, 64px);
          line-height: .92;
          letter-spacing: -.07em;
        }

        .jobCleanHero p {
          max-width: 820px;
          margin: 0;
          color: #f8fafc;
          font-weight: 850;
          line-height: 1.45;
        }

        .jobCleanGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 18px;
          margin-top: 18px;
          align-items: start;
        }

        .jobCleanCard {
          background: #fffaf0;
          border: 1px solid rgba(15,23,42,.14);
          border-radius: 26px;
          padding: 22px;
          box-shadow: 0 14px 34px rgba(15,23,42,.10);
        }

        .jobCleanCard h2 {
          margin: 0 0 14px;
          color: #111827;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -.04em;
        }

        .jobCleanFields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .jobCleanFields input,
        .jobCleanFields textarea,
        .jobCleanFields select {
          width: 100%;
          border: 2px solid #ead4b6;
          border-radius: 16px;
          background: white;
          color: #111827;
          padding: 13px 14px;
          font-size: 15px;
          font-weight: 850;
          outline: none;
        }

        .jobCleanFields textarea {
          grid-column: 1 / -1;
          min-height: 110px;
          resize: vertical;
        }

        .jobCleanControls {
          display: grid;
          gap: 10px;
        }

        .jobCleanMessage {
          margin: 0;
          background: #14532d;
          color: white;
          border-radius: 16px;
          padding: 14px;
          font-weight: 900;
          line-height: 1.45;
        }

        .jobCleanControls button {
          width: 100%;
          border: 0;
          border-radius: 16px;
          padding: 14px;
          font-weight: 1000;
          cursor: pointer;
        }

        .jobCleanSave {
          background: #16a34a;
          color: #052e16;
        }

        .jobCleanDark {
          background: #111827;
          color: white;
        }

        .jobCleanRecent {
          margin-top: 18px;
        }

        .jobCleanList {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .jobCleanList button {
          text-align: left;
          border: 2px solid #ead4b6;
          border-radius: 18px;
          background: white;
          padding: 13px;
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }

        .jobCleanList small {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-weight: 800;
        }

        @media (max-width: 1050px) {
          .jobCleanGrid {
            grid-template-columns: 1fr;
          }

          .jobCleanList {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .jobCleanHero,
          .jobCleanCard {
            border-radius: 22px;
            padding: 18px;
          }

          .jobCleanFields,
          .jobCleanList {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="jobCleanWrap">
        <article className="jobCleanHero">
          <small>Jobs</small>
          <h1>Recurring jobs that actually repeat.</h1>
          <p>Save weekly, fortnightly, monthly or custom repeat settings. Completing a recurring job can create the next job.</p>
        </article>

        <section className="jobCleanGrid">
          <section className="jobCleanCard">
            <h2>Recurring setup</h2>
            <div className="jobCleanFields">
              <input placeholder="Job title" value={form.title} onChange={(e) => update("title", e.target.value)} />
              <input placeholder="Client" value={form.client} onChange={(e) => update("client", e.target.value)} />
              <input placeholder="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
              <input placeholder="Scheduled date/time" value={form.scheduled_date} onChange={(e) => update("scheduled_date", e.target.value)} />
              <select value={form.recurring} onChange={(e) => update("recurring", e.target.value)}>
                {repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input placeholder="Custom repeat days" value={form.custom_repeat_days} onChange={(e) => update("custom_repeat_days", e.target.value)} />
              <input placeholder="Price / rate" value={form.price} onChange={(e) => update("price", e.target.value)} />
              <input placeholder="Job ID" value={form.job_id} onChange={(e) => update("job_id", e.target.value)} />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </section>

          <section className="jobCleanCard jobCleanControls">
            <h2>Owner controls</h2>
            <p className="jobCleanMessage">{message}</p>
            <button disabled={busy} onClick={saveRecurring} className="jobCleanSave">
              {busy ? "Saving..." : `Save ${labelRepeat(form.recurring)}`}
            </button>
            <button disabled={busy} onClick={completeRecurring} className="jobCleanDark">
              Complete + create next
            </button>
          </section>
        </section>

        <section className="jobCleanCard jobCleanRecent">
          <h2>Recent jobs</h2>
          <div className="jobCleanList">
            {jobs.slice(0, 12).map((job) => (
              <button key={idOf(job)} onClick={() => setForm(formFromJob(job))}>
                {first(job.title, job.customer_name, "Untitled job")}
                <small>{first(job.status, job.recurring_frequency, idOf(job))}</small>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
