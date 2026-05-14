import ImageWorkspacePage from "./ImageWorkspacePage";

export default function WorkspaceList({
  title,
  eyebrow,
  description,
  items = [],
  type = "records",
  createType,
  onCreate,
  reload,
}) {
  return (
    <ImageWorkspacePage
      title={title}
      kicker={eyebrow || String(type).toUpperCase()}
      subtitle={description || "Clean owner-approved workspace."}
      items={items}
      type={type}
      primaryLabel={`New ${type}`}
      onPrimary={() => {
        if (onCreate && createType) onCreate(createType);
        else if (reload) reload();
      }}
    />
  );
}
