import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function PlansPage() {
  return (
    <SimpleDataPage
      title="Plans"
      subtitle="Manage subscriptions, trial status, and upgrades."
      endpoint="/plans"
      createTo="#"
    />
  );
}
