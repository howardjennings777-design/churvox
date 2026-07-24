import React from "react";
import "./controlBoardHealth.css";

export default function ControlBoardHealth({ failures = [], refresh }) {
  const [retrying, setRetrying] = React.useState(false);
  if (!failures.length) return null;

  const retry = async () => {
    setRetrying(true);
    try { await refresh(); }
    finally { setRetrying(false); }
  };

  const names = failures.map((item) => item.source).join(", ");
  return <section className="cv7DataHealth" role="alert" data-testid="control-board-data-health">
    <span aria-hidden="true">!</span>
    <div><b>Some live business data did not load.</b><p>{names} may be showing the last reliable records. Churvox has not replaced them with a false empty state.</p></div>
    <button type="button" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry now"}</button>
  </section>;
}
