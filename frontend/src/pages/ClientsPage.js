import { SimpleDataPage } from './_tradieFactory';
// CHURVOX_MODERN_WEBSITE_ACTIVE_PAGE
export default function ClientsPage() {
  return <SimpleDataPage title="Clients" subtitle="Track customer history, contacts, and property details." endpoint="/clients" createTo="/clients" secondary={{ to: '/clients', label: 'CSV Import' }} />;
}
