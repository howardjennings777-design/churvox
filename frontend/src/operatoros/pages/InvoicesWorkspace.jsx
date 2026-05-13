import WorkspaceList from "../components/WorkspaceList";

export default function InvoicesWorkspace({ data, onCreate }) {
  return (
    <WorkspaceList
      title="Invoices"
      eyebrow="CASHFLOW"
      description="Track draft, sent, unpaid and paid invoices."
      items={data.invoices || []}
      type="invoice"
      endpoint="/invoices"
      createType="invoices"
      onCreate={onCreate}
      reload={data.reload}
    />
  );
}
