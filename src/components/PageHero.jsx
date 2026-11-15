/** Dark green header band used at the top of a page. `aside` renders as the quiet card on the right. */
export default function PageHero({ eyebrow, title, text, actions, aside }) {
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
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}
