import WorkspaceList from "../components/WorkspaceList";

export default function ClientsWorkspace({ data, onCreate }) {
  return (
    <WorkspaceList
      title="Clients"
      eyebrow="CLIENTS"
      description="Client records, contact details and job history context."
      items={data.clients || []}
      type="client"
      endpoint="/clients"
      createType="clients"
      onCreate={onCreate}
      reload={data.reload}
    />
  );
}
