import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import Ico from './Ico.jsx';
import NotificationBell from './NotificationBell.jsx';
import './role-shell.css';

/**
 * Shared dashboard shell (sidebar + topbar + optional hero) for resident / collector / admin.
 *
 * Props:
 *   navItems      — [key, iconName, label, searchKeywords?] (4th element ignored)
 *   tab, onTab    — controlled active tab
 *   role          — role key ('resident' | 'collector' | 'admin') for notif storage keys
 *   roleLabel     — display name, e.g. 'Collector / Driver'
 *   hero          — { title, sub } or null to hide the hero
 *   notifSources  — { drops, reports, schedules, routes, redemptions }
 *   buildNotifs   — ({ drops, reports, schedules, routes, redemptions }) => items[]
 *   children      — page content
 */
export default function RoleShell({
  navItems, tab, onTab, role, roleLabel,
  hero = null,
  notifSources = {}, buildNotifs,
  children,
}) {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const firstName = (user?.name || '').split(' ')[0] || roleLabel;
  const initial = (firstName || '?').charAt(0).toUpperCase();

  // Close the mobile drawer on Escape and prevent body scroll while it is open.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [navOpen]);

  const navTo = (key) => { onTab(key); setNavOpen(false); };

  return (
    <div className="rs-shell">
      <aside className={`rs-sidebar${navOpen ? ' open' : ''}`} aria-label="Dashboard navigation">
        <div className="rs-logo">
          <div className="rs-logo-art" aria-hidden="true" />
          <div>
            <div className="rs-logo-name">EcoBin</div>
            <div className="rs-logo-tag">Recycle. Earn.<br />Keep it Green.</div>
          </div>
        </div>

        <nav className="rs-nav">
          {navItems.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => navTo(key)}
              aria-current={tab === key ? 'page' : undefined}
            >
              <span className="rs-nav-icon"><Ico n={icon} /></span>
              {label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="rs-logout"
          onClick={() => logout?.()}
        >
          <span className="rs-nav-icon"><Ico n="logout" /></span>
          Log Out
        </button>
      </aside>

      {navOpen && <button type="button" className="rs-overlay" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      <main className="rs-main">
        <button type="button" className="rs-burger" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
          <span aria-hidden="true">☰</span> Menu
        </button>

        <header className="rs-topbar">
          <NotificationBell
            role={role}
            sources={notifSources}
            buildItems={buildNotifs}
            onNavigate={(key) => onTab(key)}
          />

          <div className="rs-user">
            <div className="rs-avatar">{initial}</div>
            <div>
              <div className="rs-user-name">{user?.name || roleLabel}</div>
              <div className="rs-user-role">{roleLabel}</div>
            </div>
          </div>
        </header>

        {hero && (
          <section className="rs-hero">
            <h1>{hero.title}</h1>
            <p>{hero.sub}</p>
          </section>
        )}

        {children}
      </main>
    </div>
  );
}
