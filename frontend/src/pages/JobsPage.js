import { SimpleDataPage } from './_tradieFactory';
// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function JobsPage() {
  return <SimpleDataPage title="Jobs" subtitle="Control schedules, assignments, and status updates." endpoint="/jobs" createTo="/jobs/new" />;
}
