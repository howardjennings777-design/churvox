import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function TeamPage() {
  return (
    <SimpleDataPage
      title="Team"
      subtitle="Manage crew roles, permissions, and access."
      endpoint="/team"
      createTo="#"
    />
  );
}
