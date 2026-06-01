// CHURVOX_COMMAND_FIRST_SETUP_PROMPT_ROUTER_20260601
import React from "react";
import { Link, useLocation } from "react-router-dom";
import ConceptCPageExact from "./ConceptCPageExact.jsx";
import TeamWorkspacePage from "../pages/TeamWorkspacePage";
import "./CommandFirstSetupPrompt.css";

const SETUP_KEY = "churvox_first_setup_pending";

function setupDone(search) {
  try {
    const params = new URLSearchParams(search || "");
    return params.get("first_setup") === "done" || localStorage.getItem(SETUP_KEY) === "done";
  } catch {
    return false;
  }
}

function FirstSetupPrompt() {
  const location = useLocation();
  const [hidden, setHidden] = React.useState(false);
  const params = React.useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const jobId = params.get("job_id") || "";

  if (hidden || !setupDone(location.search)) return null;

  function closePrompt() {
    try { localStorage.removeItem(SETUP_KEY); } catch {}
    setHidden(true);
  }

  return (
    <aside className="cv-first-setup-prompt" data-version="CHURVOX_COMMAND_FIRST_SETUP_PROMPT_ROUTER_20260601">
      <p>First setup complete</p>
      <h2>Command Floor is live.</h2>
      <span>Your plan, business setup, first client and first job are connected. From here, Churvox turns work into owner decisions.</span>
      <div>
        {jobId ? <Link className="primary" to={`/jobs/${jobId}`}>Open first job Work Slip</Link> : null}
        <Link className="success" to="/quotes/new">Create first quote</Link>
        <Link to="/invoices/new">Create first invoice</Link>
      </div>
      <button type="button" onClick={closePrompt}>Got it</button>
    </aside>
  );
}

export default function ConceptCPageExactRouter(props) {
  if (props?.area === "team") return <TeamWorkspacePage />;
  return (
    <>
      <ConceptCPageExact {...props} />
      {props?.area === "dashboard" ? <FirstSetupPrompt /> : null}
    </>
  );
}
