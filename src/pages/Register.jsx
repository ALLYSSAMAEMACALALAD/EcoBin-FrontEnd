import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import './Register.css';

// Public sign-up always creates a Resident. Collector and admin accounts are created by an admin.
export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', barangay: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(form);
      window.location.assign(ROLE_HOME[user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rg-page">
      <div className="rg-card">
        {/* Left: brand panel */}
        <aside className="rg-left">
          <div className="rg-logo-mark">♻️</div>
          <div className="rg-brand">EcoBin</div>
          <p className="rg-tag">Recycle. Earn. Keep it Green.</p>

          <div className="rg-mascot" aria-hidden="true">🗑️</div>

          <div className="rg-banner">
            <span className="rg-banner-icon">🌱</span>
            <span>
              Together for a<br />
              Cleaner Community
            </span>
          </div>
        </aside>

        {/* Right: sign-up form */}
        <section className="rg-right">
          <h1 className="rg-title">
            Get your eco-ID <span className="rg-leaf">🍃</span>
          </h1>
          <p className="rg-sub">Create a resident account in one step</p>

          <Notice kind="error">{error}</Notice>

          <form onSubmit={submit} className="rg-form">
            <div className="rg-field">
              <span className="rg-field-icon" aria-hidden="true">👤</span>
              <input
                type="text"
                placeholder="Full name"
                aria-label="Full name"
                value={form.name}
                onChange={set('name')}
                required
                autoComplete="name"
              />
            </div>

            <div className="rg-field">
              <span className="rg-field-icon" aria-hidden="true">✉️</span>
              <input
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>

            <div className="rg-field">
              <span className="rg-field-icon" aria-hidden="true">📱</span>
              <input
                type="tel"
                placeholder="Mobile number (for SMS reminders)"
                aria-label="Mobile number"
                value={form.phone}
                onChange={set('phone')}
                autoComplete="tel"
              />
            </div>

            <div className="rg-field">
              <span className="rg-field-icon" aria-hidden="true">📍</span>
              <input
                type="text"
                placeholder="Barangay / zone"
                aria-label="Barangay or zone"
                value={form.barangay}
                onChange={set('barangay')}
                required
              />
            </div>

            <div className="rg-field">
              <span className="rg-field-icon" aria-hidden="true">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min. 8 characters)"
                aria-label="Password"
                value={form.password}
                onChange={set('password')}
                minLength={8}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="rg-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <button className="rg-btn-primary" type="submit" disabled={busy}>
              <span aria-hidden="true">✚</span>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="rg-footer">
            Already registered?{' '}
            <Link className="rg-link" to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}