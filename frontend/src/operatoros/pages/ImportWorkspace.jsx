import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function ImportWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Import"
      kicker="IMPORT CENTRE"
      subtitle="Bring in clients, workers and business records cleanly."
      items={data.imports || data.clients || data.workers || []}
      type="imports"
      primaryLabel="New"
      onPrimary={() => onCreate?.("import")}
      onNav={onNav}
    />
  );
}
