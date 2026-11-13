import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Notice } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';
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

  return (
    <div className="public-page">
      <PageHero
        eyebrow="Account"
        title="Reset your password"
        text="Enter your email, type the 6-digit code we send you, then choose a new password."
      />
      <div className="auth-wrap">
        {step === 'email' && (
          <form className="card auth-card" onSubmit={sendCode}>
            <h2>Forgot password</h2>
            <Notice kind={msg.kind}>{msg.text}</Notice>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <button className="btn primary block" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
            <p className="muted center">
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        )}

        {step === 'code' && (
          <form className="card auth-card" onSubmit={verifyCode}>
            <h2>Enter the code</h2>
            <Notice kind={msg.kind}>{msg.text}</Notice>
            <p className="muted center">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <div className="fp-otp" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
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
            <button className="btn primary block" disabled={busy || !codeComplete}>
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <p className="muted center">
              Didn't get the email?{' '}
              <button type="button" className="btn small ghost" onClick={startOver}>
                Send again
              </button>
            </p>
          </form>
        )}

        {step === 'password' && (
          <form className="card auth-card" onSubmit={resetPassword}>
            <h2>New password</h2>
            <Notice kind={msg.kind}>{msg.text}</Notice>
            <label>
              New password (min. 8 characters)
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="btn primary block" disabled={busy}>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
            <p className="muted center">
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
