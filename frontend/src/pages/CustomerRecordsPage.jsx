import V2Shell from "../churvox-v2/V2Shell";
import ClientsV2Page from "../churvox-v2/ClientsV2Page";

export default function CustomerRecordsPage() {
  return (
    <V2Shell active="clients">
      <ClientsV2Page />
    </V2Shell>
  );
}
