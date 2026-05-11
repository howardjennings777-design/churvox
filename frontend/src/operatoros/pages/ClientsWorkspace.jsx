import WorkspaceList from "../components/WorkspaceList";

export default function ClientsWorkspace({ data }) {
  return (
    <WorkspaceList
      title="Clients"
      eyebrow="CUSTOMERS"
      description="Customers and sites in one clean workspace."
      items={data.clients || []}
      type="client"
    />
  );
}
