import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function QuotesWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Quotes"
      kicker="QUOTE PIPELINE"
      subtitle="Track quote follow-ups, approvals and conversion-ready opportunities."
      items={data.quotes || []}
      type="quotes"
      primaryLabel="New"
      onPrimary={() => onCreate?.("quotes")}
      onNav={onNav}
    />
  );
}
