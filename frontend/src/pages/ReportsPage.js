import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function ReportsPage() {
  return (
    <SimpleDataPage
      title="Reports"
      subtitle="Monitor performance across jobs and revenue."
      endpoint="/reports"
      createTo="#"
    />
  );
}
