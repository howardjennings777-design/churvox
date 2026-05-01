import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function QuoteDetailPage() {
  return (
    <SimpleDataPage
      title="Quote Detail"
      subtitle="Review quote line items and approval status."
      endpoint="/quotes"
      createTo="#"
    />
  );
}
