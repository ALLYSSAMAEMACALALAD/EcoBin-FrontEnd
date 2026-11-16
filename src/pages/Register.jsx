import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../lib/auth.jsx';
import { Notice } from '../components/ui.jsx';
import PasswordChecklist from '../components/PasswordChecklist.jsx';
import { isPasswordStrong } from '../lib/password.js';
import { NAUJAN_BARANGAYS, isNaujanBarangay } from '../lib/naujanBarangays.js';

// Small line icons (no extra library needed)
const PATHS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M3 3l18 18" /></>,
  login: <><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /><path d="m10 17 5-5-5-5M15 12H3" /></>,
  plus: <path d="M12 5v14M5 12h14" />
};

// Bolds the first occurrence of the typed query inside a suggestion label.
function matchPart(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong>{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </>
  );
}

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

// Public sign-up always creates a Resident. Collector and admin accounts are created by an admin.
// Pass `onClose` to show the form as a popup (used by the Login page).
// Without it, this is the normal full /register page.
export default function Register({ onClose }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', barangay: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // the new user, shown in the success modal

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Barangay autocomplete — suggestions only while typing
  const barangayRef = useRef(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const barangayQuery = form.barangay.trim().toLowerCase();
  const barangayMatches = barangayQuery
    ? NAUJAN_BARANGAYS
        .filter((b) => b.toLowerCase().includes(barangayQuery))
        .sort((a, b) => Number(b.toLowerCase().startsWith(barangayQuery)) - Number(a.toLowerCase().startsWith(barangayQuery)))
        .slice(0, 8)
    : [];

  useEffect(() => {
    if (!suggestOpen) return undefined;
    const onDown = (e) => {
      if (barangayRef.current && !barangayRef.current.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [suggestOpen]);

  function pickBarangay(name) {
    setForm({ ...form, barangay: name });
    setSuggestOpen(false);
    setHighlight(-1);
  }

  function onBarangayChange(e) {
    setForm({ ...form, barangay: e.target.value });
    setSuggestOpen(true);
    setHighlight(-1);
  }

  function onBarangayKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestOpen(true);
      setHighlight((h) => Math.min(h + 1, barangayMatches.length - 1));
      return;
    }
    if (!suggestOpen || barangayMatches.length === 0) {
      if (e.key === 'Escape') setSuggestOpen(false);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      pickBarangay(barangayMatches[highlight]);
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!isNaujanBarangay(form.barangay)) {
      setError('Please type a barangay in Naujan, Oriental Mindoro. Start typing to see suggestions.');
      return;
    }
    if (!isPasswordStrong(form.password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a special character.');
      return;
    }
    setBusy(true);
    try {
      const user = await register(form);
      setCreated(user); // show the success modal; the button below takes them to the dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const goToDashboard = () => window.location.assign(ROLE_HOME[created.role]);

  // Esc: closes the success modal (goes to dashboard) or, in popup mode, closes the form
  useEffect(() => {
    if (!created && !onClose) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (created) window.location.assign(ROLE_HOME[created.role]);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [created, onClose]);

  const formSection = (
    <section className="rg-right">
      <h1 className="rg-title">Get your eco-ID <span className="rg-leaf">🍃</span></h1>
      <p className="rg-sub">Create a resident account in one step</p>

      <Notice kind="error">{error}</Notice>

      <form onSubmit={submit} className="rg-form">
        <div className="rg-field">
          <span className="rg-field-icon" aria-hidden="true"><FIcon n="user" /></span>
          <input type="text" placeholder="Full name" aria-label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
        </div>
        <div className="rg-field">
          <span className="rg-field-icon" aria-hidden="true"><FIcon n="mail" /></span>
          <input type="email" placeholder="Email" aria-label="Email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </div>
        <div className="rg-field rg-field-suggest" ref={barangayRef}>
          <span className="rg-field-icon" aria-hidden="true"><FIcon n="pin" /></span>
          <input
            type="text"
            role="combobox"
            aria-expanded={suggestOpen && barangayMatches.length > 0}
            aria-controls="naujan-barangay-list"
            aria-autocomplete="list"
            placeholder="Barangay / zone (e.g. Del Pilar)"
            aria-label="Barangay or zone"
            value={form.barangay}
            onChange={onBarangayChange}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={onBarangayKeyDown}
            autoComplete="off"
            required
          />
          {suggestOpen && barangayMatches.length > 0 && (
            <ul className="rg-suggest" id="naujan-barangay-list" role="listbox" aria-label="Barangay suggestions">
              {barangayMatches.map((b, i) => (
                <li key={b} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    className={i === highlight ? 'active' : ''}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => { e.preventDefault(); pickBarangay(b); }}
                  >
                    {matchPart(b, barangayQuery)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rg-field">
          <span className="rg-field-icon" aria-hidden="true"><FIcon n="lock" /></span>
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
            <FIcon n={showPassword ? 'eyeOff' : 'eye'} />
          </button>
        </div>

        <PasswordChecklist password={form.password} />
        <button className="rg-btn-primary" type="submit" disabled={busy || !isPasswordStrong(form.password)}>
          <FIcon n="plus" size={18} />
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="rg-footer">
        Already registered?{' '}
        {onClose ? (
          <button type="button" className="rg-link rg-link-btn" onClick={onClose}>Sign in</button>
        ) : (
          <Link className="rg-link" to="/login">Sign in</Link>
        )}
      </p>
    </section>
  );

  const successModal = created && (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="signup-modal-title">
        <div className="modal-icon" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
          </svg>
        </div>
        <h2 id="signup-modal-title">Account created!</h2>
        <p className="muted">
          Welcome to EcoBin, {(created.name || form.name || '').split(' ')[0] || 'neighbor'}. Your resident account is ready.
        </p>
        {created.eco_id && (
          <div className="modal-id">
            <span>Your Eco-ID</span>
            <strong className="mono">{created.eco_id}</strong>
          </div>
        )}
        <p className="muted modal-note">Show your Eco-ID at the drop-off hub so your points can be credited.</p>
        <button type="button" className="btn primary" onClick={goToDashboard} autoFocus>
          Go to my dashboard →
        </button>
      </div>
    </div>
  );

  // ---------- Popup mode (opened from the Login page) ----------
  if (onClose) {
    return (
      <>
        {!created && (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div className="rg-modal" role="dialog" aria-modal="true" aria-label="Create account">
              <button type="button" className="rg-modal-x" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              {formSection}
            </div>
          </div>
        )}
        {successModal}
      </>
    );
  }

  // ---------- Normal full page (/register) ----------
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

        {/* Right: register form */}
        {formSection}
      </div>

      {successModal}
    </div>
  );
}