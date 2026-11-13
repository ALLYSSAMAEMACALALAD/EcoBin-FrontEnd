import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Notice } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const codeComplete = code.length === 6;

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      const d = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setStep('reset');
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

  async function resetPassword(e) {
    e.preventDefault();
    if (!codeComplete) {
      setMsg({ kind: 'error', text: 'Enter the 6-digit code from your email first.' });
      return;
    }
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

  return (
    <div className="public-page">
      <PageHero
        eyebrow="Account"
        title="Reset your password"
        text="Enter the 6-digit code from your email first, then choose your new password."
      />
      <div className="auth-wrap">
        {step === 'email' ? (
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
        ) : (
          <form className="card auth-card" onSubmit={resetPassword}>
            <h2>Enter the code</h2>
            <Notice kind={msg.kind}>{msg.text}</Notice>
            <label>
              6-digit code
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCode(value);
                  if (value.length < 6) {
                    setPassword('');
                    setConfirm('');
                  }
                }}
                required
              />
            </label>
            {codeComplete ? (
              <>
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
              </>
            ) : (
              <p className="muted center">
                Enter the 6-digit code from your email to reveal the password fields.
              </p>
            )}
            <p className="muted center">
              Didn't get the email?{' '}
              <button type="button" className="btn small ghost" onClick={() => setStep('email')}>
                Send again
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}