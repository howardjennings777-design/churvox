import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function ProofToPaidWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Proof-to-Paid"
      kicker="PROOF TO PAID"
      subtitle="Turn completed work, proof, photos and notes into invoice-ready owner approvals."
      items={data.completedJobs || data.jobs || []}
      type="proof"
      primaryLabel="New"
      onPrimary={() => onCreate?.("invoices")}
      onNav={onNav}
    />
  );
}
