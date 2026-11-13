
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

        {/* Left: Brand Panel */}
        <aside className="lg-left">
          <div className="lg-logo-mark">♻️</div>

          <div className="lg-brand">EcoBin</div>

          <p className="lg-tag">
            Recycle. Earn. Keep it Green.
          </p>

          <div className="lg-mascot" aria-hidden="true">
            🗑️
          </div>

          <div className="lg-banner">
            <span className="lg-banner-icon">🌱</span>
            <span>
              Together for a<br />
              Cleaner Community
            </span>
          </div>
        </aside>

        {/* Right: Login Form */}
        <section className="lg-right">

          <h1 className="lg-title">
            Welcome Back! <span className="lg-leaf">🍃</span>
          </h1>

          <p className="lg-sub">
            Log in to your EcoBin account
          </p>

          <Notice kind="error">{error}</Notice>

          <form onSubmit={submit} className="lg-form">

            {/* Email */}
            <div className="lg-field">
              <span className="lg-field-icon" aria-hidden="true">
                👤
              </span>

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

            {/* Password */}
            <div className="lg-field">
              <span className="lg-field-icon" aria-hidden="true">
                🔒
              </span>

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
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Forgot password */}
            <p className="lg-forgot">
              <Link className="lg-link" to="/forgot-password">
                Forgot password?
              </Link>
            </p>

            {/* Login Button */}
            <button
              className="lg-btn-primary"
              type="submit"
              disabled={busy}
            >
              <span aria-hidden="true">⇥</span>
              {busy ? 'Logging in…' : 'Log In'}
            </button>

          </form>

          {/* Register Link */}
          <p className="lg-footer">
            Already have an account?{' '}
            <Link className="lg-link" to="/register">
              Sign Up
            </Link>
          </p>

        </section>
      </div>
    </div>
  );
}
