import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function InvoicesPage() {
  return (
    <SimpleDataPage
      title="Invoices"
      subtitle="Manage billing, payment status, and reminders."
      endpoint="/invoices"
      createTo="/invoices"
    />
  );
}
