import WorkspaceList from "../components/WorkspaceList";

export default function CrewWorkspace({ data }) {
  return (
    <WorkspaceList
      title="Crew"
      eyebrow="TEAM"
      description="Workers, roles, regions and assignment readiness."
      items={data.workers || []}
      type="worker"
    />
  );
}
