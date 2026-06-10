import React from "react";
import "./fresh.css";
import "./freshCommandBoxes.css";
import FreshShell from "./FreshShell";
import FreshCommand from "./FreshCommand";
import FreshClients from "./FreshClients";
import FreshSimple from "./FreshSimple";

export default function FreshApp() {
  const [page, setPage] = React.useState("command");

  let content = <FreshSimple page={page} />;
  if (page === "command") content = <FreshCommand />;
  if (page === "clients") content = <FreshClients />;

  return (
    <FreshShell active={page} onChange={setPage}>
      {content}
    </FreshShell>
  );
}
