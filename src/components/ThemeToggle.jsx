import { useEffect, useState } from 'react';

export default function ThemeToggle({ floating = false }) {
  const [theme, setTheme] = useState(() => {
    try {
      return (
        document.documentElement.getAttribute('data-theme') ||
        localStorage.getItem('theme') ||
        'light'
      );
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <button
      type="button"
      className={'theme-toggle' + (floating ? ' theme-float' : '')}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}