
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        setFeedback({
          kind: 'success',
          message:
            'If an account exists for that email, password reset instructions will be sent.',
        });

        setEmail('');
      } else if ([404, 405, 501].includes(response.status)) {
        setFeedback({
          kind: 'error',
          message:
            'Password recovery is not configured on the server yet. No email has been sent.',
        });
      } else if (response.status === 429) {
        setFeedback({
          kind: 'error',
          message:
            'Too many requests. Please try again later.',
        });
      } else {
        setFeedback({
          kind: 'error',
          message:
            'Unable to process your request right now. Please try again later.',
        });
      }
    } catch {
      setFeedback({
        kind: 'error',
        message:
          'Unable to reach the server. No reset email has been confirmed.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-page forgot-password-page">
      <PageHero
        eyebrow="Account recovery"
        title="Let's get you back into Eco-Bin."
        text="Enter your account email address to request a secure password reset."
        actions={
          <Link className="btn outline-light" to="/login">
            Back to sign in
          </Link>
        }
      />

      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <h2>Forgot password?</h2>

          <p className="muted">
            Enter the email address associated with your account.
          </p>

          {feedback && (
            <p
              className={`recovery-feedback ${feedback.kind}`}
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            className="btn primary block"
            disabled={busy}
          >
            {busy ? 'Sending request…' : 'Request password reset'}
          </button>
        </form>
      </div>
    </div>
  );
}
