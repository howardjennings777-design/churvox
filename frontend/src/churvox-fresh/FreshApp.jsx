import React from "react";
import "./fresh.css";
import "./freshCommandBoxes.css";
import "./freshMobileNav.css";

import FreshShell from "./FreshShell";
import FreshCommand from "./FreshCommand";
import FreshClients from "./FreshClients";
import FreshJobs from "./FreshJobs";
import FreshDispatch from "./FreshDispatch";
import FreshInvoices from "./FreshInvoices";
import FreshQuotes from "./FreshQuotes";
import FreshTeam from "./FreshTeam";
import FreshPayroll from "./FreshPayroll";
import FreshReports from "./FreshReports";
import FreshSettings from "./FreshSettings";
import FreshPlans from "./FreshPlans";
import FreshSupport from "./FreshSupport";
import FreshSimple from "./FreshSimple";

const pages = new Set([
  "command",
  "jobs",
  "dispatch",
  "clients",
  "quotes",
  "invoices",
  "team",
  "payroll",
  "reports",
  "settings",
  "plans",
  "support",
]);

function readPageFromHash() {
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();
  return pages.has(hash) ? hash : "command";
}

export default function FreshApp() {
  const [page, setPage] = React.useState(readPageFromHash);

  React.useEffect(() => {
    const onHashChange = () => setPage(readPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function goToPage(nextPage) {
    if (!pages.has(nextPage)) return;

    setPage(nextPage);

    const nextUrl = `${window.location.pathname}#${nextPage}`;
    window.history.replaceState(null, "", nextUrl);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let content = <FreshSimple page={page} />;
  if (page === "command") content = <FreshCommand onNavigate={goToPage} />;
  if (page === "jobs") content = <FreshJobs />;
  if (page === "dispatch") content = <FreshDispatch />;
  if (page === "clients") content = <FreshClients />;
  if (page === "quotes") content = <FreshQuotes />;
  if (page === "invoices") content = <FreshInvoices />;
  if (page === "team") content = <FreshTeam />;
  if (page === "payroll") content = <FreshPayroll />;
  if (page === "reports") content = <FreshReports />;
  if (page === "settings") content = <FreshSettings />;
  if (page === "plans") content = <FreshPlans />;
  if (page === "support") content = <FreshSupport />;

  return (
    <FreshShell active={page} onChange={goToPage}>
      {content}
    </FreshShell>
  );
}
