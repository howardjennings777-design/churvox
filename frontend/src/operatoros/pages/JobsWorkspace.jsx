import WorkspaceList from "../components/WorkspaceList";

export default function JobsWorkspace({ data }) {
  return (
    <WorkspaceList
      title="Jobs"
      eyebrow="RUN SHEET"
      description="Create, review and dispatch jobs. Details open in a drawer, not random pages."
      items={data.jobs || []}
      type="job"
    />
  );
}
