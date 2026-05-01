export default function ModernStatCard({ label, value, hint }) {
  return (
    <article className="modern-stat modern-stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}
