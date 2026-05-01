import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function ClientDetailPage() {
  return (
    <SimpleDataPage
      title="Client Detail"
      subtitle="View client history, jobs, quotes, and invoices."
      endpoint="/clients"
      createTo="#"
    />
  );
}
