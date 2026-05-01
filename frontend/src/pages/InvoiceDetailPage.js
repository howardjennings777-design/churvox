import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function InvoiceDetailPage() {
  return (
    <SimpleDataPage
      title="Invoice Detail"
      subtitle="Review invoice status and payment activity."
      endpoint="/invoices"
      createTo="#"
    />
  );
}
