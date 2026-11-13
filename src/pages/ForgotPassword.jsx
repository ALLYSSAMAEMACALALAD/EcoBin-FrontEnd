import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Notice } from '../components/ui.jsx';
import './ForgotPassword.css';

const CODE_LENGTH = 6;

function emptyDigits() {
  return Array.from({ length: CODE_LENGTH }, () => '');
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(emptyDigits);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const otpRefs = useRef([]);

  const code = digits.join('');
  const codeComplete = code.length === CODE_LENGTH;

  function focusBox(index) {
    const box = otpRefs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))];
    if (box) {
      box.focus();
      box.select();
    }
  }

  function setFrom(index, text) {
    const clean = String(text || '').replace(/\D/g, '');
    if (!clean) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i += 1) {
        next[index + i] = clean[i];
      }
      return next;
    });
    focusBox(index + clean.length);
  }

  function handleDigitChange(index, event) {
    const raw = event.target.value.replace(/\D/g, '');
    if (raw.length > 1) {
      setFrom(index, raw);
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
    if (raw) focusBox(index + 1);
  }

  function handleDigitKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
      focusBox(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(emptyDigits().map((_, i) => pasted[i] || ''));
    focusBox(pasted.length);
  }

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      const d = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setDigits(emptyDigits());
      setStep('code');
      setMsg({
        kind: 'success',
        text: d.message || 'If an account exists for this email, a 6-digit code has been sent.',
      });
    } catch (err) {
      setMsg({ kind: 'error', text: `Could not send the code: ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    if (!codeComplete) {
      setMsg({ kind: 'error', text: 'Enter the complete 6-digit code.' });
      return;
    }
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      await api('/auth/verify-reset-code', { method: 'POST', body: { email, code } });
      setPassword('');
      setConfirm('');
      setStep('password');
      setMsg({ kind: 'success', text: 'Code verified. Choose your new password.' });
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Invalid or expired code.' });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ kind: 'error', text: 'The passwords do not match.' });
      return;
    }
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      await api('/auth/reset-password', { method: 'POST', body: { email, code, password } });
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Could not reset the password.' });
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setDigits(emptyDigits());
    setPassword('');
    setConfirm('');
    setMsg({ kind: 'info', text: '' });
    setStep('email');
  }

  const titles = {
    email: { h: 'Forgot password?', sub: 'Enter your email and we will send you a 6-digit code' },
    code: { h: 'Enter the code', sub: `We sent a 6-digit code to ${email}` },
    password: { h: 'New password', sub: 'Choose a new password for your account' },
  };

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

        {/* Right: steps */}
        <section className="fp-right">
          <h1 className="fp-title">
            {titles[step].h} <span className="fp-leaf">🍃</span>
          </h1>
          <p className="fp-sub">{titles[step].sub}</p>

          <Notice kind={msg.kind}>{msg.text}</Notice>

          {step === 'email' && (
            <form onSubmit={sendCode} className="fp-form">
              <div className="fp-field">
                <span className="fp-field-icon" aria-hidden="true">✉️</span>
                <input
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <button className="fp-btn-primary" type="submit" disabled={busy}>
                <span aria-hidden="true">✉</span>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} className="fp-form">
              <div className="fp-otp" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    className="fp-otp-box"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  />
                ))}
              </div>

              <button className="fp-btn-primary" type="submit" disabled={busy || !codeComplete}>
                <span aria-hidden="true">✓</span>
                {busy ? 'Verifying…' : 'Verify code'}
              </button>

              <p className="fp-footer">
                Didn't get the email?{' '}
                <button type="button" className="fp-link-btn" onClick={startOver}>
                  Send again
                </button>
              </p>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={resetPassword} className="fp-form">
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

              <button className="fp-btn-primary" type="submit" disabled={busy}>
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