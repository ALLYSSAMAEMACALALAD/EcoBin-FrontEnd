import useTheme from '../lib/theme.jsx';

/**
 * Authenticated role-page wrapper. The role shells (RoleShell) render their own
 * topbar with search, bell and user cluster — this wrapper only adds the
 * floating dark/light theme toggle so it shows on resident/collector/admin pages only.
 */
export default function Layout({ children }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <>
      <button
        type="button"
        className="theme-toggle-float"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
        <span className="hide-sm">{theme === 'light' ? 'Dark' : 'Light'}</span>
      </button>
      {children}
    </>
  );
}
