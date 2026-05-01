export default function TradieHero({ title, subtitle, actions }) {
  return (
    <section className="tradie-hero">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="tradie-hero__actions">{actions}</div> : null}
    </section>
  );
}
