import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function idOf(job) {
  return String(job?.id || job?._id || "");
}

function first(...values) {
  return values.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || "";
}

export default function JobsCommandPage() {
  const api = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  async function loadJobs() {
    setLoading(true);
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
      toast.error("Could not load jobs");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadJobs();
  }, []);

  return (
    <main className="jobsClean">
      <style>{`
        .jobsClean,
        .jobsClean * {
          box-sizing: border-box;
        }

        .jobsClean {
          width: 100%;
          color: #111827;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .jobsCleanWrap {
          width: 100%;
          max-width: 1260px;
          margin: 0;
        }

        .jobsHero {
          background:
            radial-gradient(circle at 86% -20%, rgba(249,115,22,.48), transparent 30%),
            linear-gradient(135deg, #0b1018 0%, #111827 58%, #070b12 100%);
          color: white;
          border-left: 8px solid #f97316;
          border-radius: 30px;
          padding: 26px 30px;
          box-shadow: 0 18px 48px rgba(15,23,42,.18);
        }

        .jobsHero small {
          color: #fbbf24;
          font-weight: 1000;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .jobsHero h1 {
          max-width: 900px;
          margin: 14px 0 10px;
          font-size: clamp(36px, 5.2vw, 64px);
          line-height: .92;
          letter-spacing: -.07em;
        }

        .jobsHero p {
          max-width: 840px;
          margin: 0;
          color: #f8fafc;
          font-weight: 850;
          line-height: 1.45;
        }

        .jobsToolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .jobsToolbar a,
        .jobsToolbar button {
          border: 0;
          border-radius: 999px;
          padding: 12px 16px;
          background: #f97316;
          color: #111827;
          text-decoration: none;
          font-weight: 1000;
          cursor: pointer;
        }

        .jobsToolbar button {
          background: #111827;
          color: #fff;
        }

        .jobsPanel {
          margin-top: 18px;
          background: #fffaf0;
          border: 1px solid rgba(15,23,42,.14);
          border-radius: 26px;
          padding: 22px;
          box-shadow: 0 14px 34px rgba(15,23,42,.10);
        }

        .jobsPanel h2 {
          margin: 0 0 14px;
          color: #111827;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -.04em;
        }

        .jobsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .jobsCard {
          display: block;
          min-height: 138px;
          border: 2px solid #ead4b6;
          border-left: 6px solid #f97316;
          border-radius: 20px;
          background: white;
          padding: 15px;
          color: #111827;
          text-decoration: none;
          font-weight: 900;
        }

        .jobsCard b {
          display: block;
          font-size: 20px;
          line-height: 1.1;
          letter-spacing: -.03em;
        }

        .jobsCard span {
          display: block;
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
          line-height: 1.35;
        }

        .jobsCard small {
          display: inline-flex;
          margin-top: 12px;
          border-radius: 999px;
          background: #111827;
          color: #fbbf24;
          padding: 7px 10px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .1em;
        }

        .jobsEmpty {
          margin: 0;
          color: #475569;
          font-weight: 850;
        }

        @media (max-width: 1100px) {
          .jobsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .jobsHero,
          .jobsPanel {
            border-radius: 22px;
            padding: 18px;
          }

          .jobsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="jobsCleanWrap">
        <article className="jobsHero">
          <small>Jobs</small>
          <h1>Jobs, scheduling and repeat work.</h1>
          <p>One clean Jobs area inside the Churvox sidebar. No second sidebar, no separate workbench shell.</p>
          <div className="jobsToolbar">
            <a href="/jobs/new">Add job</a>
            <button type="button" onClick={loadJobs}>Refresh jobs</button>
          </div>
        </article>

        <section className="jobsPanel">
          <h2>{loading ? "Loading jobs..." : `${jobs.length} jobs`}</h2>
          {jobs.length ? (
            <div className="jobsGrid">
              {jobs.slice(0, 60).map((job) => (
                <a className="jobsCard" href={`/jobs/${idOf(job)}`} key={idOf(job) || first(job.title, job.customer_name)}>
                  <b>{first(job.title, job.job_title, job.customer_name, "Untitled job")}</b>
                  <span>{first(job.client_name, job.customer_name, job.address, "No client details yet")}</span>
                  <small>{first(job.status, job.recurring_frequency, "assigned")}</small>
                </a>
              ))}
            </div>
          ) : (
            <p className="jobsEmpty">{loading ? "Checking jobs..." : "No jobs yet. Add your first job."}</p>
          )}
        </section>
      </section>
    </main>
  );
}
