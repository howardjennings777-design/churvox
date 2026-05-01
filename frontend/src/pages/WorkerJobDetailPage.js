import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function WorkerJobDetailPage() {
  return (
    <SimpleDataPage
      title="Worker Job Detail"
      subtitle="Access assignment details and task actions."
      endpoint="/worker/jobs"
      createTo="#"
    />
  );
}
