import { SimpleDataPage } from './_tradieFactory';
import { SimpleDataPage } from './_tradieFactory';

// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function CommunicationsPage() {
  return (
    <SimpleDataPage
      title="Communications"
      subtitle="Send updates, reminders, and customer broadcasts."
      endpoint="/sms"
      createTo="#"
    />
  );
}
