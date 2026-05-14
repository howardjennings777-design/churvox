import ImageWorkspacePage from "../components/ImageWorkspacePage";

export default function PayrollWorkspace({ data = {}, onCreate, onNav }) {
  return (
    <ImageWorkspacePage
      data={data}
      title="Payroll"
      kicker="PAYROLL"
      subtitle="Review hours, approved time and payroll handoff without clutter."
      items={data.payroll || data.workers || []}
      type="payroll"
      primaryLabel="New"
      onPrimary={() => onCreate?.("payroll")}
      onNav={onNav}
    />
  );
}
