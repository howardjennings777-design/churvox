import React from "react";
import { useApi } from "../hooks/useApi";

export default function FreshCsvImportButton({ endpoint, label, className = "freshGhost", disabled = false, onDone, onError }) {
  const { post } = useApi();
  const inputRef = React.useRef(null);
  const [importing, setImporting] = React.useState(false);

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing) return;

    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    const res = await post(endpoint, formData, { timeout: 60000 });
    setImporting(false);

    if (!res.success) {
      onError?.(res.error || "CSV import failed");
      return;
    }

    onDone?.(res.data?.data || res.data || {});
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        data-churvox-csv-import={endpoint}
        style={{ display: "none" }}
        onChange={importCsv}
      />
      <button
        className={className}
        type="button"
        disabled={disabled || importing}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? "Importing CSV..." : label}
      </button>
    </>
  );
}
