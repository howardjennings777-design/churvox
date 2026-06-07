import IndustrialSimplePage from "../components/IndustrialSimplePage";

// Launch rule: this page must never render the old pale prepared-actions screen again.
// /dashboard and /ai-operator both use the same premium dark Command slip system.
export default function CommandDeskQueuePage() {
  return <IndustrialSimplePage kind="command" />;
}
