import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import Register from './Register.jsx';

// Small line icons (no extra library needed)
const PATHS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M3 3l18 18" /></>,
  login: <><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /><path d="m10 17 5-5-5-5M15 12H3" /></>,
  plus: <path d="M12 5v14M5 12h14" />
};

function FIcon({ n, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[n]}
    </svg>
  );
}


export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      window.location.assign(ROLE_HOME[user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lg-page">
      <div className="lg-card">
        {/* Left: brand panel */}
        <aside className="lg-left">
          <div className="lg-logo-mark">♻️</div>
          <div className="lg-brand">EcoBin</div>
          <p className="lg-tag">Recycle. Earn. Keep it Green.</p>
          <div className="lg-mascot" aria-hidden="true">🗑️</div>
          <div className="lg-banner">
            <span className="lg-banner-icon">🌱</span>
            <span>
              Together for a<br />
              Cleaner Community
            </span>
          </div>
        </aside>

        {/* Right: login form */}
        <section className="lg-right">
          <h1 className="lg-title">Welcome Back! <span className="lg-leaf">🍃</span></h1>
          <p className="lg-sub">Log in to your EcoBin account</p>

          <Notice kind="error">{error}</Notice>

          <form onSubmit={submit} className="lg-form">
            <div className="lg-field">
              <span className="lg-field-icon" aria-hidden="true"><FIcon n="user" /></span>
              <input
                type="email"
                placeholder="Email or Username"
                aria-label="Email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="lg-field">
              <span className="lg-field-icon" aria-hidden="true"><FIcon n="lock" /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lg-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <FIcon n={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>

            <p className="lg-forgot"><Link className="lg-link" to="/forgot-password">Forgot password?</Link></p>

            <button className="lg-btn-primary" type="submit" disabled={busy}>
              <FIcon n="login" size={18} />
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p className="lg-footer">
            Don't have an account?{' '}
            <button type="button" className="lg-link lg-link-btn" onClick={() => setShowRegister(true)}>
              Sign Up
            </button>
          </p>
        </section>
      </div>

      {showRegister && <Register onClose={() => setShowRegister(false)} />}
    </div>
  );
}