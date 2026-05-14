import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function SettingsWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Settings"
      kicker="WORKSPACE SETTINGS"
      subtitle="Business setup, account preferences and owner controls."
      items={data.settings || []}
      type="settings"
      primaryLabel="New"
      onPrimary={() => onCreate?.("settings")}
      onNav={onNav}
    />
  );
}
