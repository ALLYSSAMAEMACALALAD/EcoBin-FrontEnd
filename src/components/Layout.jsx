import { Link, useNavigate } from 'react-router-dom';
import useTheme from '../lib/theme.jsx';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { LeafIcon } from './icons.jsx';

const ROLE_LABEL = { resident: 'Resident', collector: 'Collector / Driver', admin: 'Admin' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const onLogout = async () => { await logout(); navigate('/login'); };
  return (
    <div className="app">
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
      <header className="topbar">
        <Link to={ROLE_HOME[user.role]} className="brand">
          <LeafIcon size={22} className="brand-mark" />
          <span className="brand-name">EcoBin</span>
        </Link>
        <div className="who">
          <span className={`badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
          <span className="muted hide-sm">{user.name}</span>
          <button className="signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
