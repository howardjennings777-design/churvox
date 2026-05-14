import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function CrewWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Crew"
      kicker="CREW & DISPATCH"
      subtitle="Worker availability, roles, regions and dispatch context in one clean view."
      items={data.workers || data.team || []}
      type="crew"
      primaryLabel="New"
      onPrimary={() => onCreate?.("team")}
      onNav={onNav}
    />
  );
}
