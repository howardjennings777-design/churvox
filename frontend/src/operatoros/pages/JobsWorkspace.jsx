import WorkspaceList from "../components/WorkspaceList";

export default function JobsWorkspace({ data, onCreate }) {
  return (
    <WorkspaceList
      title="Jobs"
      eyebrow="RUN SHEET"
      description="Create, review and dispatch jobs. Details open in a drawer, not random pages."
      items={data.jobs || []}
      type="job"
      endpoint="/jobs"
      createType="jobs"
      onCreate={onCreate}
      reload={data.reload}
    />
  );
}
