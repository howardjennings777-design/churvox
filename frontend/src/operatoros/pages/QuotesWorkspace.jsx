import WorkspaceList from "../components/WorkspaceList";

export default function QuotesWorkspace({ data }) {
  return (
    <WorkspaceList
      title="Quotes"
      eyebrow="QUOTE DESK"
      description="Drafts, sent quotes and AI follow-up suggestions."
      items={data.quotes || []}
      type="quote"
    />
  );
}
