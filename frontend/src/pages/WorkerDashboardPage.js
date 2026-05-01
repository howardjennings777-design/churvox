import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function WorkerDashboardPage() {
  return (
    <SimpleDataPage
      title="Worker Jobs"
      subtitle="View assigned work and latest updates."
      endpoint="/worker/jobs"
      createTo="#"
    />
  );
}
