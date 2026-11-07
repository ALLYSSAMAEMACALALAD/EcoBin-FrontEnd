
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';

export default function ResetPassword() {
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Remove the sensitive reset token from the address bar.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname
      );
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy || success) return;

    setError('');

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      setError(
        'Invalid reset link. Please request a new password reset.'
      );
      return;
    }

    const passwordBytes = new TextEncoder()
      .encode(password).length;

    if (passwordBytes < 12 || passwordBytes > 72) {
      setError(
        'Password must be between 12 and 72 bytes.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        '/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            token,
            password
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'Too many attempts. Please try again later.'
          );
        }

        throw new Error(
          'Unable to reset password. The link may be expired or already used.'
        );
      }

      setPassword('');
      setConfirmPassword('');
      setSuccess(true);

    } catch (err) {
      setError(
        err.message || 'Unable to reset password.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-page forgot-password-page">
      <PageHero
        eyebrow="Account recovery"
        title="Secure your Eco-Bin account."
        text="Choose a new password to continue using Eco-Bin."
        actions={
          <Link
            className="btn outline-light"
            to="/login"
          >
            Back to sign in
          </Link>
        }
      />

      <div className="auth-wrap">
        <form
          className="card auth-card"
          onSubmit={handleSubmit}
        >
          <h2>Reset password</h2>

          {success ? (
            <div
              className="recovery-feedback success"
              role="status"
            >
              Your password has been reset successfully.
              You can now sign in with your new password.
            </div>
          ) : (
            <>
              <p className="muted">
                Enter and confirm your new password.
              </p>

              {!token && (
                <p
                  className="recovery-feedback error"
                  role="alert"
                >
                  Invalid reset link. Please request a
                  new password reset.
                </p>
              )}

              {error && (
                <p
                  className="recovery-feedback error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <label>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={busy || !token}
                />
              </label>

              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={busy || !token}
                />
              </label>

              <button
                type="submit"
                className="btn primary block"
                disabled={busy || !token}
              >
                {busy
                  ? 'Updating password…'
                  : 'Reset password'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
