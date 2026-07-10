const ACTION_RESULT = /(being recorded|recorded|approved|could not record|returned to Command|did not record|owner-approved internal draft)/i;

export default function OfficeTeamContextStrip({ screen, notice = "" }) {
  const message = String(notice || "").trim();
  if (screen !== "command" || !ACTION_RESULT.test(message)) return null;

  return (
    <section className="cvCommandActionFeedback cvSiteQueueSummary" role="status" aria-live="polite" aria-label="Command action result">
      <strong>Command update</strong>
      <span>{message}</span>
    </section>
  );
}
