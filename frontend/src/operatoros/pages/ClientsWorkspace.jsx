import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function ClientsWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Clients"
      kicker="CLIENTS"
      subtitle="Customer records, contact details and job context in one clean workspace."
      items={data.clients || []}
      type="clients"
      primaryLabel="New"
      onPrimary={() => onCreate?.("clients")}
      onNav={onNav}
    />
  );
}
