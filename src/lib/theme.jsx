import { useEffect, useState } from 'react';
<<<<<<< HEAD

const STORAGE_KEY = 'ecobin.theme';

function readStored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function systemPref() {
  try { return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { return 'dark'; }
}
function apply(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('light', theme === 'light');
}
const initial = (() => {
  const t = readStored() || systemPref();
  apply(t);
  return t;
})();

let current = initial;
const listeners = new Set();

function notify() { listeners.forEach((l) => l(current)); }

export function getTheme() { return current; }
export function setTheme(next) {
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  apply(next);
  notify();
}
export function toggleTheme() { setTheme(current === 'light' ? 'dark' : 'light'); }

export default function useTheme() {
  const [theme, setT] = useState(current);
  useEffect(() => {
    const l = (t) => setT(t);
    listeners.add(l);
    setT(current);
    return () => listeners.delete(l);
  }, []);
  return [theme, toggleTheme];
=======
import { useLocation } from 'react-router-dom';

// Light / dark theme. The choice is saved in the browser, so the login page and
// every dashboard (resident, collector, admin) always use the same theme.
const KEY = 'ecobin.theme';
const EVENT = 'ecobin-theme-change';

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* storage unavailable */ }
  return 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/** Call once before the app renders (see main.jsx). */
export function initTheme() {
  applyTheme(getTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const sync = () => setThemeState(getTheme());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function setTheme(next) {
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT));
  }

  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/** Floating toggle shown on the login / register / password pages. */
export function ThemeFloat() {
  const { pathname } = useLocation();
  if (!AUTH_PATHS.includes(pathname)) return null;
  return <ThemeToggle className="theme-float" />;
>>>>>>> d1229fe8827e3542a5169eb55e664e73f04c0d42
}
