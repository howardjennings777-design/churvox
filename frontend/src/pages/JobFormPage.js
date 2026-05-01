import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function JobFormPage() {
  return (
    <SimpleDataPage
      title="Create Job"
      subtitle="Capture scope, customer, and scheduling details."
      endpoint="/jobs"
      createTo="#"
    />
  );
}
