import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Notice } from '../components/ui.jsx';
import PasswordChecklist from '../components/PasswordChecklist.jsx';
import { isPasswordStrong } from '../lib/password.js';

/** Landing page for the recovery link emailed after 3 failed login attempts. */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const linkMissing = !email || !token;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });

  async function submit(e) {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      setMsg({ kind: 'error', text: 'Password must meet all of the requirements below.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: 'error', text: 'The passwords do not match.' });
      return;
    }
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      await api('/auth/reset-password-via-link', { method: 'POST', body: { email, token, password } });
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Could not reset the password.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fp-page">
      <div className="fp-card">
        {/* Left: brand panel */}
        <aside className="fp-left">
          <div className="fp-logo-mark">♻️</div>
          <div className="fp-brand">EcoBin</div>
          <p className="fp-tag">Recycle. Earn. Keep it Green.</p>
          <div className="fp-mascot" aria-hidden="true">🗑️</div>
          <div className="fp-banner">
            <span className="fp-banner-icon">🌱</span>
            <span>
              Together for a<br />
              Cleaner Community
            </span>
          </div>
        </aside>

        {/* Right: reset form */}
        <section className="fp-right">
          <h1 className="fp-title">Reset your password <span className="fp-leaf">🍃</span></h1>
          <p className="fp-sub">Choose a new password for <strong>{email}</strong></p>

          <Notice kind={msg.kind}>{msg.text}</Notice>

          {linkMissing ? (
            <>
              <p className="muted">This recovery link is incomplete or invalid. Request a new one from the sign-in page.</p>
              <p className="fp-footer">
                <Link className="fp-link" to="/forgot-password">Forgot password?</Link>{' '}
                · <Link className="fp-link" to="/login">Sign in</Link>
              </p>
            </>
          ) : (
            <form onSubmit={submit} className="fp-form">
              <div className="fp-field">
                <span className="fp-field-icon" aria-hidden="true">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password (min. 8 characters)"
                  aria-label="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="fp-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="fp-field">
                <span className="fp-field-icon" aria-hidden="true">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>

              <PasswordChecklist password={password} />

              <button className="fp-btn-primary" type="submit" disabled={busy || !isPasswordStrong(password) || password !== confirm}>
                <span aria-hidden="true">↻</span>
                {busy ? 'Saving…' : 'Reset password'}
              </button>
            </form>
          )}

          <p className="fp-footer">
            Remember your password?{' '}
            <Link className="fp-link" to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
