import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function AutomationPage() {
  return (
    <SimpleDataPage
      title="Automation"
      subtitle="Manage your automation workflows, triggers, and rules."
      endpoint="/automation"
      createTo="#"
    />
  );
}
