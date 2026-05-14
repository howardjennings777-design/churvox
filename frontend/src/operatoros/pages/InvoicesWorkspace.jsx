import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function InvoicesWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Invoices"
      kicker="CASHFLOW"
      subtitle="Draft, sent, overdue and paid invoices with owner-approved actions."
      items={data.invoices || []}
      type="invoices"
      primaryLabel="New"
      onPrimary={() => onCreate?.("invoices")}
      onNav={onNav}
    />
  );
}
