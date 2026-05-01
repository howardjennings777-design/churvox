import ModernButton from './ModernButton';

export default function ModernActionCard({ title, description, ctaLabel, ctaTo, ctaVariant = 'primary', children }) {
  return (
    <section className="modern-action-card">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {children}
      {ctaLabel ? <ModernButton to={ctaTo || '#'} variant={ctaVariant}>{ctaLabel}</ModernButton> : null}
    </section>
  );
}
