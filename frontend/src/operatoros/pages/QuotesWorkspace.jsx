import WorkspaceList from "../components/WorkspaceList";

export default function QuotesWorkspace({ data, onCreate }) {
  return (
    <WorkspaceList
      title="Quotes"
      eyebrow="QUOTE PIPELINE"
      description="Review, send and follow up quote opportunities."
      items={data.quotes || []}
      type="quote"
      endpoint="/quotes"
      createType="quotes"
      onCreate={onCreate}
      reload={data.reload}
    />
  );
}
