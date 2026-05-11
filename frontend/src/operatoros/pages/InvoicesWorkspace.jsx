import WorkspaceList from "../components/WorkspaceList";

export default function InvoicesWorkspace({ data }) {
  return (
    <WorkspaceList
      title="Invoices"
      eyebrow="MONEY"
      description="Draft, unpaid, overdue and paid invoices. AI prepares reminders for approval."
      items={data.invoices || []}
      type="invoice"
    />
  );
}
