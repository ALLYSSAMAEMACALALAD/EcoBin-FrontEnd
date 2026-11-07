import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const ROLE_LABEL = { resident: 'Resident', collector: 'Collector / Driver', admin: 'Admin' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/login'); };
  return (
    <div className="app">
      <header className="topbar">
        <Link to={ROLE_HOME[user.role]} className="brand">
          <span className="brand-tile" aria-hidden="true">♻</span>
          <span className="brand-name">Eco-Bin</span>
        </Link>
        <div className="who">
          <span className={`badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
          <span className="muted hide-sm">{user.name}</span>
          <ThemeToggle />
          <button className="signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}