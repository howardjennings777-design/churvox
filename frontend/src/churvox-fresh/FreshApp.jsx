import React from "react";
import "./fresh.css";
import "./freshCommandBoxes.css";
import FreshShell from "./FreshShell";
import FreshCommand from "./FreshCommand";
import FreshClients from "./FreshClients";
import FreshDispatch from "./FreshDispatch";
import FreshInvoices from "./FreshInvoices";
import FreshJobs from "./FreshJobs";
import FreshQuotes from "./FreshQuotes";
import FreshSimple from "./FreshSimple";

export default function FreshApp() {
  const [page, setPage] = React.useState("command");

  let content = <FreshSimple page={page} />;
  if (page === "command") content = <FreshCommand />;
  if (page === "clients") content = <FreshClients />;
  if (page === "dispatch") content = <FreshDispatch />;
  if (page === "invoices") content = <FreshInvoices />;
  if (page === "quotes") content = <FreshQuotes />;
  if (page === "jobs") content = <FreshJobs />;

  return (
    <FreshShell active={page} onChange={setPage}>
      {content}
    </FreshShell>
  );
}
