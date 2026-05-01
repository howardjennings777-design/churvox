import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import TradiePage from '../components/tradie/TradiePage';
import TradieHero from '../components/tradie/TradieHero';
import TradiePanel from '../components/tradie/TradiePanel';
import TradieEmptyState from '../components/tradie/TradieEmptyState';

// CHURVOX_TRADIE_V3_ACTIVE_PAGE
export default function SmartHubPage() {
  const [stats, setStats] = useState({ jobs: 0, clients: 0, invoices: 0, quotes: 0 });
  const [jobs, setJobs] = useState([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      apiFetch('/jobs'),
      apiFetch('/clients'),
      apiFetch('/invoices'),
      apiFetch('/quotes'),
    ]).then(([j, c, i, q]) => {
      const getValues = (result) =>
        result.status === 'fulfilled'
          ? Array.isArray(result.value)
            ? result.value
            : result.value?.items || result.value?.results || []
          : [];

      const jobsData = getValues(j);
      const clients = getValues(c);
      const invoices = getValues(i);
      const quotes = getValues(q);

      setJobs(jobsData.slice(0, 5));
      setStats({
        jobs: jobsData.length,
        clients: clients.length,
        invoices: invoices.length,
        quotes: quotes.length,
      });
      setErr([j, c, i, q].every((result) => result.status === 'rejected'));

      if (j.status === 'rejected') {
        console.log(j.reason);
      }
    });
  }, []);

  return (
    <TradiePage>
      <TradieHero
        title="Smart Hub"
        subtitle="Today’s jobs, customers, invoices, and actions in one place."
        actions={
          <>
            <Link className="btn" to="/jobs/new">
              Create Job
            </Link>
            <Link className="btn secondary" to="/clients">
              Add Client
            </Link>
          </>
        }
      />

      <div className="strip">
        <div className="stat">
          <strong>Jobs today</strong>
          <div>{stats.jobs}</div>
        </div>
        <div className="stat">
          <strong>Active clients</strong>
          <div>{stats.clients}</div>
        </div>
        <div className="stat">
          <strong>Open invoices</strong>
          <div>{stats.invoices}</div>
        </div>
        <div className="stat">
          <strong>Quotes pending</strong>
          <div>{stats.quotes}</div>
        </div>
      </div>

      <TradiePanel title="Today's Focus">
        {err ? (
          <TradieEmptyState />
        ) : (
          <p>Keep momentum on in-progress jobs and follow up overdue invoices.</p>
        )}
      </TradiePanel>

      <TradiePanel title="Recent jobs">
        {jobs.length ? (
          <table>
            <tbody>
              {jobs.map((job, idx) => (
                <tr key={job.id || idx}>
                  <td>{job.title || job.job_name || `Job ${idx + 1}`}</td>
                  <td>
                    <span className="badge success">{job.status || 'In progress'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TradieEmptyState message="No recent jobs." hint="Create a job to start your day." />
        )}
      </TradiePanel>
    </TradiePage>
  );
}
