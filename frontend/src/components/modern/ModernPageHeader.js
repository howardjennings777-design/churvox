import ModernHero from './ModernHero';

export default function ModernPageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <ModernHero
      title={title}
      subtitle={(
        <>
          {eyebrow ? <span className="modern-eyebrow">{eyebrow}</span> : null}
          <span>{subtitle}</span>
        </>
      )}
      actions={actions}
    />
  );
}
