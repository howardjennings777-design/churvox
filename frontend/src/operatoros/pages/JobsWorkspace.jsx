import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function JobsWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Jobs"
      kicker="RUN SHEET"
      subtitle="Clean job board for scheduled, assigned, in-progress and completed work."
      items={data.jobs || []}
      type="jobs"
      primaryLabel="New"
      onPrimary={() => onCreate?.("jobs")}
      onNav={onNav}
    />
  );
}
