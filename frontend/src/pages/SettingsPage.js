import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function SettingsPage() {
  return (
    <SimpleDataPage
      title="Settings"
      subtitle="Control account, business profile, and defaults."
      endpoint="/settings"
      createTo="#"
    />
  );
}
