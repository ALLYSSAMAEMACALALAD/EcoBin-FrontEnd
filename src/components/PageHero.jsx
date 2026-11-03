/** Dark green hero band used at the top of every page. `aside` renders as the light card on the right. */
export default function PageHero({ eyebrow, title, text, actions, aside, icon = '♻' }) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {text && <p className="hero-text">{text}</p>}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
        {aside && (
          <div className="hero-card">
            <div className="hero-icon" aria-hidden="true">{icon}</div>
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}
