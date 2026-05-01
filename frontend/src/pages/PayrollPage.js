import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function PayrollPage() {
  return (
    <SimpleDataPage
      title="Payroll"
      subtitle="Review timesheets, payout status, and approvals."
      endpoint="/timesheets"
      createTo="#"
    />
  );
}
